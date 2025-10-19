import KnowledgeSearch from '@/components/KnowledgeSearch';

export default function KnowledgePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            基于CLIP的多模态知识检索系统
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            使用本地CLIP模型构建的向量数据库，支持文本和图片的语义搜索，
            为智能导师系统提供强大的RAG检索能力。
          </p>
        </div>
        
        <KnowledgeSearch />
      </div>
    </div>
  );
} 