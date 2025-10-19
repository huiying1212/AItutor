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

    // 先尝试连接本地后端，如果失败则使用HF部署的后端
    let knowledgeResponse;
    const requestBody = JSON.stringify({
      query: query,
      top_k: top_k,
      mode: "multimodal"
    });
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody
    };
    
    try {
      // 先检查本地后端是否可用
      console.log('Trying local backend at http://localhost:8000/search/text');
      const localResponse = await fetch('http://localhost:8000/search/text', {
        ...requestOptions,
        // 设置较短的超时时间以快速判断本地服务是否可用
        signal: AbortSignal.timeout(1000)
      });
      
      if (localResponse.ok) {
        console.log('Using local backend');
        knowledgeResponse = localResponse;
      } else {
        throw new Error('Local backend not available');
      }
    } catch (error) {
      // 本地后端不可用，使用HF部署的后端
      console.log('Local backend not available, falling back to HF deployment');
      knowledgeResponse = await fetch('https://hoy1212-aitutor.hf.space/search/text', requestOptions);
    }

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