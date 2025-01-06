import { Provide, Inject } from '@midwayjs/core';
import { GeweService } from './gewe.service';
import { AIModelService } from '../../openai/service/models.service';
import { AgentService } from '../../openai/service/agent.service';
import { ChatService } from '../../openai/service/chat.service';
import { QueueService } from '../../base/service/queue.service';

import { Message } from '../class/message.class';

import { PrismaClient } from '@prisma/client';
// import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import * as _ from 'lodash';

type OmitPrismaClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">

@Provide()
export class WxMessageService {
  @Inject('prisma')
  prisma: PrismaClient;
  @Inject()
  geweService: GeweService;
  @Inject()
  aIModelService: AIModelService;
  @Inject()
  AgentService: AgentService;
  @Inject()
  chatService: ChatService;
  @Inject()
  queueService: QueueService;

  async sendMsg(
    appId: string,
    toWxid: string,
    content: string,
    ats: string = ''
  ) {
    const params = { appId, toWxid, ats, content };
    const url = '/message/postText';
    const result = await this.geweService.post(url, params);
    return result.data;
  }

  async handleTextMsg(msg: Message): Promise<void> {
    // 检查是否配置了机器人
    const aiBot = await this.prisma.aIBot.findFirst({
      where: { wxId: msg.wxid },
      include: {
        tools: true,
      }
    });
    if (!aiBot) return console.log('未配置AI机器人!');
    const text = msg.text();
    if (msg.isRoom) {
      const prefix = aiBot.groupChatPrefix;
      const testPrefix = prefix ? text.startsWith(prefix) : true;
      const inList = (aiBot.groupListId || []).includes(msg.fromId);
      const testNext = aiBot.groupListMode === 1 ? !inList : inList;
      if (testPrefix && testNext) {
        const llm = await this.aIModelService.getOpenAIModel(aiBot.modelId);
        const input = text.slice(prefix ? prefix.length : 0);
        // const messages = [new SystemMessage(aiBot?.prompt || ''), new HumanMessage(input)];
        // 群聊信息发送人wxid
        const [sender] = msg._text.split(':');
        const searchParam = {
          appId: msg.appid,
          llm,
          input,
          groupId: msg.fromId,
          sender,
          aiBot,
        };
        const res = aiBot.useAgent
          ? await this.AgentService.wxAgent(searchParam)
          : await this.chatService.wxPrivate(input, llm, msg, aiBot);
        return this.sendMsg(msg.appid, msg.fromId, res.content.toString());
      }
    } else if (!msg._self) {
      const prefix = aiBot.singleChatPrefix;
      const testPrefix = prefix ? text.startsWith(prefix) : true;
      const inList = (aiBot.singleListId || []).includes(msg.fromId);
      const testNext = aiBot.singleListMode === 1 ? !inList : inList;
      if (testPrefix && testNext) {
        const chat = await this.aIModelService.getOpenAIModel(aiBot.modelId);
        const input = text.slice(prefix ? prefix.length : 0);
        // const messages = [new SystemMessage(aiBot?.prompt || ''), new HumanMessage(input)];
        const searchParam = {
          appId: msg.appid,
          llm: chat,
          input,
          groupId: '',
          sender: msg.fromId,
          aiBot,
        };
        const res = aiBot.useAgent
          ? await this.AgentService.wxAgent(searchParam)
          : await this.chatService.wxPrivate(input, chat, msg, aiBot);
        return this.sendMsg(msg.appid, msg.fromId, res.content.toString());
      }
    }
    // 发给ai的指令不用入库
    if (aiBot.useDataSource) this.saveChatHistory(msg, aiBot.emModelId);
  }

  async handleMessage(msg: Message) {
    console.log('@msg: ', msg._newMsgId);
    const type = msg.type();
    if (type === 'text') {
      this.handleTextMsg(msg);
    }
  }

  async saveChatHistory(msg: Message, emModelId: number) {
    const type = msg.type();
    if (type !== 'text') throw new Error('不能处理这类消息！');
    const isRoom = msg.isRoom;
    const isSendRoom = msg.isSendRoom;
    if (type === 'text') {
      const text = msg._text;
      const data = {
        id: msg._newMsgId + '',
        appId: msg.appid,
        wxId: msg.wxid,
        type: msg._type,
        fromId: msg.fromId,
        toId: msg.toId,
        content: msg.text(),
        pushContent: msg._pushContent,
        postTime: new Date(),
      } as any;

      if (isRoom) {
        data.groupId = msg.fromId;
        const [_fromId] = text.split(':');
        data.fromId = _fromId;
      } else if (isSendRoom) {
        // 自己发群里的信息，收信人改为自己
        data.groupId = msg.toId;
        data.toId = msg.fromId;
      } else {
        data.fromId = msg.fromId;
      }
      // console.log('@调试', msg, data);
      // 企业微信无法获取信息
      if (data.fromId.endsWith('@openim')) return console.log('企微无法获取信息')
      try {
        const { store, gid } = await this.prisma.$transaction(async client => {
          const result = {
            store: null,
            uid: null,
            gid: null
          };
          // 检查发信人、收信人是否存在，否则自动入库
          const uIds = await this.addContactsIfMiss(data.appId, [data.fromId, data.toId], client, data.groupId);
          result.uid = uIds[0];
          // 检查群数据是否存在，否则自动入库
          if (data.groupId) {
            // 返回入库的群id列表
            const gIds = await this.addGroupIfMiss(msg.appid, [data.groupId], client);
            result.gid = gIds[0];
          }
          // 入库
          result.store = await client.wxMessage.create({ data });
          return result
        });
        // 更新向量化数据到聊天记录表，用于检索
        const res = await this.addEmbeddingText(store.id, store.content, emModelId)
        console.log('@入库成功: ', store.pushContent, res);
        // 新入库的群，需要全量更新群成员信息
        if (data.groupId && gid) {
          // 耗时任务使用队列维护群信息，需要先有群信息，否则不会更新
          this.queueService.addTask('updateGroup', async () => {
            this.updateGroupMembers(msg.appid, data.groupId).then(() => console.log('更新群成员'));
          });
        }
      } catch (error) {
        console.error(error);
      }
    }
  }

  // 向量化入库
  async addEmbeddingText(id: string, content: string, emModelId: number) {
    const embeddingArr = await this.aIModelService.embedding(emModelId, content);
    const tableName = 'wx_message'
    const query = `
          UPDATE "${tableName}"
          SET documents = $1::vector
          WHERE id = $2;
      `;
    // 使用参数化查询避免 SQL 注入
    const res = await this.prisma.$executeRawUnsafe(query, embeddingArr, id);
    return res > 0;
  }

  async addContactsIfMiss(appId: string, ids: string[], prisma: OmitPrismaClient, groupId: string = '') {
    // 处理id重复的情况，防止id冲突
    const _ids = [...new Set(ids)];
    const records = await prisma.wxContact.findMany({
      where: {
        id: {
          in: _ids,
        },
      },
      select: {
        id: true,
      },
    });
    // 提取已存在的转换为set
    const idsSet = new Set(records.map(record => record.id));
    // 过滤出不存在的
    const missIds = _ids.filter(id => !idsSet.has(id));
    if (missIds.length > 0) {
      const contacts = groupId ?
        await this.geweService.roomMemberInfo(appId, groupId, missIds) :
        await this.geweService.contactsInfo(appId, missIds);
      const data = contacts.map(item => {
        if (!item.userName) {
          console.error('@缺少联系人信息: ', groupId, missIds, item);
        }
        const obj = _.pick(item, ['nickName', 'pyInitial', 'sex', 'bigHeadImgUrl', 'smallHeadImgUrl', 'country', 'province', 'city']);
        return { ...obj, id: item.userName }
      });
      await prisma.wxContact.createMany({ data });
    }
    return missIds;
  }

  async addGroupIfMiss(appId: string, ids: string[], prisma: OmitPrismaClient) {
    // 处理id重复的情况，防止id冲突
    const _ids = [...new Set(ids)];
    const records = await prisma.wxGroup.findMany({
      where: {
        id: {
          in: _ids,
        },
      },
      select: {
        id: true,
      },
    });
    // 提取已存在的转换为set
    const idsSet = new Set(records.map(record => record.id));
    // 过滤出不存在的
    const missIds = _ids.filter(id => !idsSet.has(id));
    if (missIds.length > 0) {
      const groupInfos = await this.geweService.contactsInfo(appId, missIds);
      const data = groupInfos.map(item => {
        if (!item.userName) {
          console.error('@缺少群信息: ', missIds, item);
        }
        const obj = _.pick(item, ['nickName', 'pyInitial', 'chatRoomNotify', 'chatRoomOwner', 'smallHeadImgUrl'])
        return { ...obj, id: item.userName }
      });
      await prisma.wxGroup.createMany({ data });
    }
    return missIds;
  }

  // 维护群成员信息
  async updateGroupMembers(appId: string, groupId: string) {
    const count = await this.prisma.wxGroup.count({ where: { id: groupId } });
    if (count === 0) return;
    // 获取群成员列表信息
    this.prisma.$transaction(async client => {
      const gropuInfo = await this.geweService.roomMemberList(appId, groupId);
      const list = gropuInfo.memberList;
      await client.wxContact.createMany({
        data: list.map(item => {
          return {
            id: item.wxid,
            nickName: item.nickName,
            bigHeadImgUrl: item.bigHeadImgUrl,
            smallHeadImgUrl: item.smallHeadImgUrl,
          };
        }),
        skipDuplicates: true,
      });
      await client.wxGroup.update({
        where: { id: groupId },
        data: {
          chatRoomOwner: gropuInfo.chatroomOwner,
          contacts: {
            connect: list.map(item => ({ id: item.wxid })),
          },
        },
      });
    });
  }
}
