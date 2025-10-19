'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { Search, Upload, Image as ImageIcon, FileText, Loader2, AlertCircle } from 'lucide-react';

interface TextResult {
  chapter_number: number;
  chapter_name: string;
  chunk_id: number;
  text: string;
  type: 'text';
  similarity_score: number;
  weighted_score?: number;
}

interface ImageResult {
  chapter_number: number;
  chapter_name: string;
  image_id: number;
  image_url: string;
  image_description: string;
  image_path: string;
  type: 'image';
  similarity_score: number;
  weighted_score?: number;
}

interface SearchResults {
  query: string;
  text_results?: TextResult[];
  image_results?: ImageResult[];
  combined_results?: (TextResult | ImageResult)[];
  total_results?: number;
}

const KnowledgeSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // const API_BASE = 'http://localhost:8000';
  const API_BASE = 'https://hoy1212-aitutor.hf.space';

  const handleTextSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/search/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          top_k: 15,
          min_score: 0.15,
          mode: 'multimodal',
        }),
      });

      if (!response.ok) {
        throw new Error(`搜索失败: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setResults(data.data);
      } else {
        throw new Error(data.message || '搜索失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索过程中发生错误');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleImageSearch = useCallback(async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('top_k', '15');
      formData.append('min_score', '0.15');

      const response = await fetch(`${API_BASE}/search/image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`图片搜索失败: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const imageResults = data.data.similar_images || [];
        const textResults = data.data.related_texts || [];
        
        const typedImageResults = imageResults.map((result: any) => ({
          ...result,
          type: 'image'
        }));
        const typedTextResults = textResults.map((result: any) => ({
          ...result,
          type: 'text'
        }));
        
        const allResults = [...typedImageResults, ...typedTextResults];
        allResults.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));
        
        setResults({
          query: `图片搜索: ${selectedFile.name}`,
          image_results: typedImageResults,
          text_results: typedTextResults,
          combined_results: allResults,
          total_results: allResults.length
        });
      } else {
        throw new Error(data.message || '图片搜索失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片搜索过程中发生错误');
    } finally {
      setLoading(false);
    }
  }, [selectedFile]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    }
  };

  const renderResult = (result: TextResult | ImageResult, index: number) => {
    const isText = result.type === 'text';
    const IconComponent = isText ? FileText : ImageIcon;
    const colorClass = isText ? 'text-blue-600' : 'text-green-600';
    
    return (
      <div key={`${result.type}-${index}`} className="bg-white rounded-lg shadow-md p-4 mb-4 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className={`flex items-center ${colorClass}`}>
            <IconComponent className="w-4 h-4 mr-2" />
            <span className="font-semibold">
              Chapter {result.chapter_number}: {result.chapter_name}
            </span>
            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
              {isText ? '文本' : '图片'}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            相似度: {(result.similarity_score * 100).toFixed(1)}%
          </span>
        </div>
        
        {isText ? (
          <p className="text-gray-700 text-sm leading-relaxed">
            {(result as TextResult).text.length > 300 
              ? `${(result as TextResult).text.substring(0, 300)}...` 
              : (result as TextResult).text
            }
          </p>
        ) : (
          <div className="flex flex-col md:flex-row gap-4">
            <Image 
              src={`/example-structuredDATA/images/${(result as ImageResult).image_url}`}
              alt={(result as ImageResult).image_description}
              width={192}
              height={128}
              className="w-full md:w-48 h-32 object-cover rounded-lg"
              sizes="(max-width: 768px) 100vw, 192px"
              onError={(e) => {
                console.log(`图片加载失败: ${(result as ImageResult).image_url}`);
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEzMyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+aXoOazleWKoOi9vTwvdGV4dD48L3N2Zz4=';
              }}
            />
            <p className="text-gray-700 text-sm flex-1">
              {(result as ImageResult).image_description}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">智能知识检索</h2>
        <p className="text-gray-600 mb-6">
          输入文本或上传图片进行搜索，系统将自动返回所有相关的文本和图片内容
        </p>
        
        {/* 文本搜索输入 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">文本搜索</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入搜索关键词"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleTextSearch()}
            />
            <button
              onClick={handleTextSearch}
              disabled={loading || !query.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span className="ml-2">搜索</span>
            </button>
          </div>
        </div>

        {/* 图片上传 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">图片搜索</label>
          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleImageSearch}
              disabled={loading || !selectedFile}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span className="ml-2">搜索</span>
            </button>
          </div>
          {selectedFile && (
            <p className="text-sm text-gray-600 mt-2">已选择: {selectedFile.name}</p>
          )}
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center text-red-700">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span className="font-medium">错误:</span>
            </div>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        )}
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600 mt-2">正在搜索相关内容...</p>
        </div>
      )}

      {/* 搜索结果 */}
      {results && !loading && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-800">
              搜索结果
            </h3>
            <div className="text-sm text-gray-600">
              共找到 {results.total_results || (results.text_results?.length || 0) + (results.image_results?.length || 0)} 个相关结果
            </div>
          </div>
          
          {/* 统一显示所有结果 */}
          {results.combined_results && results.combined_results.length > 0 ? (
            <div className="space-y-4">
              {results.combined_results.map((result, index) => renderResult(result, index))}
            </div>
          ) : (
            <div className="space-y-4">
              {results.text_results?.map((result, index) => renderResult(result, index))}
              {results.image_results?.map((result, index) => renderResult(result, index))}
            </div>
          )}

          {(!results.text_results?.length && !results.image_results?.length && !results.combined_results?.length) && (
            <div className="text-center py-12">
              <p className="text-gray-500">未找到相关结果，请尝试其他关键词</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KnowledgeSearch;