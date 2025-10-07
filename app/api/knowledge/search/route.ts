import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, top_k = 3 } = body;

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    console.log(`Searching knowledge for: "${query}"`);

    // 调用本地的多模态搜索API来获取图片
    // http://localhost:8000/search/text
    const knowledgeResponse = await fetch('https://hoy1212-aitutor.hf.space', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        top_k: top_k,
        mode: "multimodal"
      }),
    });

    if (!knowledgeResponse.ok) {
      console.warn('Knowledge API not available, proceeding without RAG enhancement');
      return NextResponse.json({
        success: true,
        knowledge: {
          context_text: "",
          related_images: 0,
          sources: [],
          images: []
        },
        message: "Knowledge database not available"
      });
    }

    const knowledgeData = await knowledgeResponse.json();
    console.log('Multimodal search response received:', knowledgeData);
    
    // 处理多模态搜索API的响应结构
    const textResults = knowledgeData.data?.text_results || [];
    const imageResults = knowledgeData.data?.image_results || [];
    
    // 构建上下文文本
    const contextText = textResults.map((item: any, index: number) => 
      `${index + 1}. 来源：${item.chapter_name}\n内容：${item.text}`
    ).join('\n\n');
    
    // 处理图片信息
    const images = imageResults.map((item: any) => ({
      url: `/example-structuredDATA/images/${item.image_url}`,
      description: item.image_description || '',
      chapter: item.chapter_name || '',
      similarity: item.similarity_score || 0
    }));
    
    // 提取唯一的来源
    const sources = [...new Set([
      ...textResults.map((item: any) => item.chapter_name),
      ...imageResults.map((item: any) => item.chapter_name)
    ])].filter(Boolean);
    
    return NextResponse.json({
      success: true,
      knowledge: {
        context_text: contextText,
        related_images: images.length,
        sources: sources,
        text_chunks: textResults.length,
        images: images
      },
      message: "Knowledge retrieved successfully"
    });

  } catch (error: any) {
    console.error("Knowledge search error:", error);
    
    // 如果知识库不可用，返回空结果而不是错误，这样对话可以继续
    return NextResponse.json({
      success: true,
      knowledge: {
        context_text: "",
        related_images: 0,
        sources: [],
        images: []
      },
      message: "Knowledge database temporarily unavailable"
    });
  }
} 