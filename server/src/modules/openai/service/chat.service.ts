import { Scope, ScopeEnum, Init, Provide } from '@midwayjs/core';
import { START, END, Annotation, MessagesAnnotation, StateGraph, MemorySaver } from "@langchain/langgraph";
import { trimMessages } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Message } from '../../wechat/class/message.class';
import { AIBot } from "prisma/prisma-client";

// import * as _ from 'lodash';

@Provide()
@Scope(ScopeEnum.Singleton)
export class ChatService {
  private memory: any;
  private app: any;

  @Init()
  async init() {
    // 初始化
    this.memory = null;
    this.app = null;
  }
  async creatApp(llm: any, aiBot: AIBot) {
    const trimmer = trimMessages({
      maxTokens: 10,
      strategy: "last",
      tokenCounter: (msgs) => msgs.length,
      includeSystem: true,
      allowPartial: false,
      startOn: "human",
    });
    const tmp_system = aiBot?.prompt || '你是一个乐于助人的助手';
    const promptTemplate = ChatPromptTemplate.fromMessages([
      ["system", "{tmp_system}"],
      ["placeholder", "{messages}"],
    ]);
    const GraphAnnotation = Annotation.Root({
      ...MessagesAnnotation.spec,
      language: Annotation<string>(),
    });
    const callModel = async (state: typeof GraphAnnotation.State) => {
      const trimmedMessage = await trimmer.invoke(state.messages);
      const prompt = await promptTemplate.invoke({
        messages: trimmedMessage,
        language: state.language,
        tmp_system: tmp_system
      });
      const response = await llm.invoke(prompt);
      return { messages: [response] };
    };
    const workflow = new StateGraph(GraphAnnotation)
      // Define the node and edge
      .addNode("model", callModel)
      .addEdge(START, "model")
      .addEdge("model", END);

    this.memory = new MemorySaver();
    this.app = workflow.compile({ checkpointer: this.memory });
  }
  // 私聊对话，保存聊天记录到内存
  async wxPrivate(input: string, llm: any, msg: Message, aiBot: AIBot) {
    if (this.app === null) {
      // 初始化
      await this.creatApp(llm, aiBot);
    }
    const messages = [
      {
        role: 'user',
        content: input,
      },
    ];
    const config = { configurable: { thread_id: msg.fromId } };
    const output = await this.app.invoke({ messages }, config);
    const msgLen = output.messages.length;
    const lastMsg = output.messages[msgLen - 1];
    return { content: lastMsg?.content || '没有返回' };
  }
}
