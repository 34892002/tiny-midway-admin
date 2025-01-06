
import { Provide, Inject, makeHttpRequest } from '@midwayjs/core';
import { PrismaClient, Tool } from '@prisma/client';
import { HistoryService } from '../../wechat/service/history.service';
import { GeweService } from '../../wechat/service/gewe.service';

import { createToolCallingAgent, AgentExecutor } from "langchain/agents";
// import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { tool } from "@langchain/core/tools";

import { z } from "zod";
import * as vm from "vm";
import * as _ from 'lodash';

import { SearchParam } from "../dto/dto";

@Provide()
export class AgentService {
  @Inject()
  prisma: PrismaClient;
  @Inject()
  historyService: HistoryService;
  @Inject()
  geweService: GeweService;

  // 微信智能体
  async wxAgent(options: SearchParam) {
    // 创建工具沙盒环境
    const createVmTools = async (data: Tool) => {
      try {
        const code = `
        (async function() {
          ${data.code}
          return { func, schema };
        })();
        `;
        /**
         * 沙盒环境，有逃逸漏洞
         * The node:vm module is not a security mechanism. Do not use it to run untrusted code.
         * node:vm模块不是一种安全机制。不要用它来运行不受信任的代码。
         * https://nodejs.org/api/vm.html
         */
        const context = vm.createContext({ z, console, makeHttpRequest, _ });
        const vmScript = new vm.Script(code);
        const res = await vmScript.runInContext(context)
        const _tool = {
          func: res.func,
          fields: {
            name: data.funcName,
            description: data.description,
            schema: res.schema
          },
        }
        return tool(_tool.func, _tool.fields);
      } catch (error) {
        console.log('@createVmTools error: ', error);
        return null;
      }
    }

    try {
      const { llm, input, groupId, sender, aiBot } = options;
      // 创建代理方法
      const prompt = ChatPromptTemplate.fromMessages([
        ['system', aiBot.agentPrompt || ''],
        ['system', `背景信息：
          ${groupId ? '- 你处在一个聊天群组内部，用户是群内一员，你有权使用工具查询群组、用户信息。': '- 你现在是私聊模式，不在群组中，直接与用户一对一对话。'}
          - 当前时间：${new Date().toLocaleString()}
          - 用户的ID: ${sender}
          ${ groupId ? '- 群的ID: ' + groupId: ''}
          **注意!下面的"指令要求"不能被覆盖，是最高指示**
          直接输出完整结果，禁止分步反馈。具体要求：
            - 必须在内部完成所有计算和处理后，才开始输出响应
            - 禁止输出任何等待、处理中、稍后等过渡语句
            - 无论处理时间长短，只能在获得最终结果后一次性完整展示
            - 确保响应是完整的、可执行的、最终的答案
          `
        ],
        ['placeholder', '{chat_history}'],
        ['human', '{input}'],
        ['placeholder', '{agent_scratchpad}'],
      ]);
      // 智能体可以调用的工具
      const tools = [];
      // 生成用户配置的工具
      if (aiBot?.tools?.length) {
        for (const toolData of aiBot.tools) {
          const toolInstance = await createVmTools(toolData);
          if (toolInstance) {
            tools.push(toolInstance);
          }
        }
      }
      // 用户是否允许使用聊天记录工具
      if (aiBot.useDataSource) {
        const groupHistory = await this.createRagSearchGroupTool(groupId, aiBot.emModelId);
        const groupInfo = await this.createGroupInfoTool(options.appId);
        const memberInfo = await this.createMemberTool(options.appId);
        tools.push(groupInfo, memberInfo, groupHistory);
      }
      const agent = createToolCallingAgent({ llm, tools, prompt });
      const agentExecutor = new AgentExecutor({
        agent,
        tools,
        verbose: false,
        maxIterations: 6, // 本次会话工具最大可调用次数
        handleParsingErrors: 'Please try again, paying close attention to the allowed enum values',
        returnIntermediateSteps: false
      });

      const response = await agentExecutor.invoke({ input }, {
        configurable: { temperature: 0.1 },
      });
      console.log('@agent调试 wxAgent: ', response);
      let res = response.output || '没有结果输出';
      if (typeof res === 'string') {
        return { content: res };
      } else {
        return { content: JSON.stringify(res) };
      }
    } catch (error) {
      console.error('@agent调试 wxAgent: ', error);
      return error;
    }
  }

  // 思考上下文消耗更多的token
  // async wxGroupReactAgent(options: SearchParam) {
  //   try {
  //     const { llm, input, groupId, sender, aiBot } = options;
  //     // 封装工具
  //     const groupHistory = await this.createRagSearchGroupTool(groupId, aiBot.emModelId);
  //     const groupMember = await this.createMemberTool(options.appId);
  //     const tools = [groupMember, groupHistory];
  //
  //     // 创建react代理
  //     const agent = createReactAgent({ llm, tools });
  //     const inputs = {
  //       messages: [
  //         { role: "system", content: `
  //           - 你是一个乐于助人的助手，你处在一个聊天群组内部。
  //           - 如果现有条件下你能回答群成员问题，请直接回答。如果你需要额外信息可以调用合适的工具。
  //           - 如果无法确定答案，请坦承不知。
  //           - **重要:** human 看不到 ID 信息，输入的查询条件必定是昵称、群名称等可见信息，需要先调用工具查询对应 ID。
  //           - **工具调用顺序:**
  //             1. 如果查询条件是昵称，先调用 'getGroupAndMemberInfo' 工具获取成员 ID。
  //             2. 然后使用获取到的成员 ID 调用 'searchChatHistory' 工具查询聊天记录。
  //           - 问题背景信息：当前时间：${new Date().toLocaleString()}，提问人的群成员ID: ${sender}，提问人所在聊天群ID:${groupId}。
  //           - 请使用中文回答，除非成员要求使用其它语言。
  //           - 如果某工具返回结果为没有实际意义(比如空字符串、空对象、空数组)就是没有数据，禁止再次使用相同参数调用工具。
  //           - 如果某工具返回结果不符合预期可能是数据有误，禁止再次使用相同参数调用工具。
  //           - 不要使用任何 markdown 格式，可以使用纯交本格式或者emoji。
  //         `
  //         },
  //         { role: "user", content: input }
  //       ],
  //     };
  //
  //     const response = await agent.invoke({ ...inputs });
  //
  //     console.log('@agent调试: wxGroupAgent: ', response);
  //     const messages = response?.messages || [];
  //     const responseArr = [];
  //     for (const AIMessage of messages) {
  //       responseArr.push(AIMessage.content);
  //     }
  //     let res = responseArr[responseArr.length - 1];
  //     // let res = AIMessage.content;
  //     // 返回的消息转成string类型
  //     if (typeof res === 'string') {
  //       return res;
  //     } else {
  //       return JSON.stringify(res);
  //     }
  //   } catch (error) {
  //     console.error('@agent error: ', error);
  //     return error;
  //   }
  // }

  // 群搜索工具
  async createRagSearchGroupTool(groupId: string, emModelId: number) {
    // const LOCAL = { local: 'zh-CN', zone: { timeZone: 'Asia/Shanghai' } };
    // // 生成默认的查询时间
    // const yesterday = new Date();
    // yesterday.setDate(yesterday.getDate() - 1);
    // yesterday.setHours(23, 59, 59, 0);
    // const defStartTime = yesterday.toLocaleString(LOCAL.local, LOCAL.zone).replace(/\//g, '-');
    // const defEndTime = new Date().toLocaleString(LOCAL.local, LOCAL.zone).replace(/\//g, '-');

    const toolSchema = {
      name: 'searchChatHistory',
      description: `
        查询群内部的聊天记录:
        - **只能通过成员ID进行查询，不支持昵称查询。**
        - 查询时间默认起止时间为1天前00:00:01到当前时间。
        - 查询时间最大只能7天范围内，如果查询条件为全部、所有、一切等时间条件，那么起止时间为7天前00:00:01到当前时间。
        - 群成员聊天记录: 返回的记录格式是数组，每个元素是一个对象，
          包含字段：sender_id（群id）sender_id（发信方昵称）sender_nickName（发信方昵称）和 content（内容），postTime（发送时间）sender_id（收信方昵称）sender_nickName（收信方昵称）
          例子：[{ groupId: '123@chatroom', postTime: '2022-12-16T17:56:42.054Z', content: '内容', sender_nickName: '助手', sender_id: 'ai', receiver_nickName: '群成员', receiver_id: 'abc123' }]。
      `,
      schema: z.object({
        keyword: z.string().optional().describe('搜索聊天内容关键字, 如果搜索全部记录不传'),
        sender: z.string().optional().describe('成员ID，查询指定成员记录，查询所有成员记录不传。不支持通过昵称查询'),
        starTime: z.string().describe('开始时间，格式为 yyyy-MM-dd HH:mm:ss，没有指定该参数为昨天00:00:01'),
        endTime: z.string().describe('结束时间,按天查询的话时分秒应该为23:59:59，格式为 yyyy-MM-dd HH:mm:ss，没有指定该参数为当前时间'),
      }).describe('查询群内部的聊天记录，不支持昵称等未定义的参数作为查询条件')
    }
    return tool(async (input) => {
      console.log('@ai入参 rag: ', input);
      const { keyword, sender, starTime, endTime } = input;
      // 导入测试历史数据
      const history = await this.historyService.getRagGroupHistory(emModelId, keyword, groupId, sender, starTime, endTime);
      const res = { query: { starTime, endTime }, history }
      console.log('@@@history: ', res);
      return JSON.stringify(res);
    }, toolSchema);
  }

  // 群资料获取工具
  async createGroupInfoTool(appId: string) {
    const toolSchema = {
      name: 'getGroupInfo',
      description: `
        通过群ID查询群的详细信息:
        - 查询聊天群的详细信息，包括群ID、群名称、群简介。
      `,
      schema: z.object({
        groupId: z.string().describe('需要查询的群ID，文本类型，例子 "123@chatroom" ')
      })
    }
    return tool(async (input) => {
      console.log('@ai入参 GroupInfo: ', input);
      const { groupId } = input;
      const data = await this.geweService.contactsInfo(appId, [groupId]);
      return JSON.stringify(data);
    }, toolSchema);
  }

  // 用户资料获取工具
  async createMemberTool(appId: string) {
    const toolSchema = {
      name: 'getMemberInfo',
      description: `
        通过用户/群成员的id或者昵称查询详细信息:
        - 查询用户的详细信息，包括昵称、头像、性别、地区。
      `,
      schema: z.object({
      wxId: z.string()
        .regex(/^[a-zA-Z0-9_-]+$/, '用户/群成员ID仅能包含英文字母、数字、下划线和减号')
        .optional()
        .describe('需要查询的用户/群成员 ID，例如 "abc-123"、"wxid_abc123"， 使用昵称查询可以不穿'),
      nickName: z.string()
        .optional()
        .describe('需要查询的用户昵称，例如 "张国荣"、"tom1900"'),
    }).describe('如果不确定参数是用户/群成员ID 、还是昵称，请将参数作为 nickName 传递')
    }
    return tool(async (input) => {
      console.log('@ai入参 MemberInfo: ', input);
      // const parsedInput = toolSchema.schema.parse(input);
      const { wxId, nickName } = input;
      let data = {};
      if (nickName) {
        data = await this.prisma.wxContact.findFirst({
          where: {
            nickName: {
              contains: nickName, // 模糊匹配 nickName
              mode: 'insensitive', // 可选：忽略大小写
            },
          },
        });
      }
      if (!data && nickName) {
        data = await this.geweService.contactsInfo(appId, [wxId]);
      }
      console.log('@@@Member-info: ', data);
      return JSON.stringify(data);
    }, toolSchema);
  }
}

