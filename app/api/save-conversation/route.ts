import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const { logs, sessionId, timestamp } = await request.json();

    if (!logs || !Array.isArray(logs)) {
      return NextResponse.json(
        { error: "Invalid logs data" },
        { status: 400 }
      );
    }

    // 创建对话记录文件夹（如果不存在）
    const logsDir = path.join(process.cwd(), "conversation_logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // 生成文件名：使用时间戳
    const date = new Date(timestamp || Date.now());
    const filename = `conversation_${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}.json`;
    const filePath = path.join(logsDir, filename);

    // 准备保存的数据
    const conversationData = {
      sessionId: sessionId || "unknown",
      timestamp: timestamp || Date.now(),
      date: date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      messageCount: logs.length,
      messages: logs.map((log: any, index: number) => ({
        index: index + 1,
        type: log.type,
        role: log.role,
        content: log.content || log.transcript || log.arguments || "",
        timestamp: log.timestamp,
        ...log // 保留所有原始数据
      }))
    };

    // 保存到文件
    fs.writeFileSync(filePath, JSON.stringify(conversationData, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      filename,
      messageCount: logs.length,
      path: filePath
    });

  } catch (error: any) {
    console.error("Error saving conversation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save conversation" },
      { status: 500 }
    );
  }
}

// GET 方法：获取所有保存的对话记录列表
export async function GET() {
  try {
    const logsDir = path.join(process.cwd(), "conversation_logs");
    
    if (!fs.existsSync(logsDir)) {
      return NextResponse.json({ conversations: [] });
    }

    const files = fs.readdirSync(logsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.modified.getTime() - a.modified.getTime()); // 按修改时间降序

    return NextResponse.json({ conversations: files });

  } catch (error: any) {
    console.error("Error listing conversations:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list conversations" },
      { status: 500 }
    );
  }
}

