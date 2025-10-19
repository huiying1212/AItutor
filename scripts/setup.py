#!/usr/bin/env python3
"""
设置脚本 - 检查和准备多模态向量数据库环境
"""

import os
import sys
from pathlib import Path

def check_directories():
    """检查必要的目录结构"""
    required_dirs = [
        "./models/clip-vit-base-patch32",
        "./public/example-structuredDATA",
        "./public/example-structuredDATA/images",
        "./scripts",
        "./vector_database"
    ]
    
    missing_dirs = []
    
    for dir_path in required_dirs:
        if not os.path.exists(dir_path):
            missing_dirs.append(dir_path)
    
    return missing_dirs

def check_files():
    """检查必要的文件"""
    required_files = [
        "./public/example-structuredDATA/content2.jsonl",
        "./public/example-structuredDATA/image2.json",
        "./models/clip-vit-base-patch32/config.json",
        "./requirements.txt"
    ]
    
    missing_files = []
    
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
    
    return missing_files

def create_missing_directories(missing_dirs):
    """创建缺失的目录"""
    for dir_path in missing_dirs:
        os.makedirs(dir_path, exist_ok=True)
        print(f"✓ 创建目录: {dir_path}")

def check_python_packages():
    """检查Python包"""
    try:
        import torch
        import transformers
        import faiss
        import PIL
        import numpy
        print("✓ 核心Python包已安装")
        return True
    except ImportError as e:
        print(f"✗ 缺少Python包: {e}")
        return False

def main():
    print("开始检查多模态向量数据库环境...")
    print("=" * 50)
    
    # 检查目录
    print("\n1. 检查目录结构...")
    missing_dirs = check_directories()
    
    if missing_dirs:
        print("缺失的目录:")
        for dir_path in missing_dirs:
            print(f"  - {dir_path}")
        
        create_missing_directories(missing_dirs)
    else:
        print("✓ 所有必要目录已存在")
    
    # 检查文件
    print("\n2. 检查必要文件...")
    missing_files = check_files()
    
    if missing_files:
        print("缺失的文件:")
        for file_path in missing_files:
            print(f"  - {file_path}")
        
        if "./models/clip-vit-base-patch32/config.json" in missing_files:
            print("\n⚠️  CLIP模型文件缺失！")
            print("请确保您已经下载了CLIP模型到 ./models/clip-vit-base-patch32/ 目录")
            print("模型文件应包括:")
            print("  - config.json")
            print("  - pytorch_model.bin 或 model.safetensors")
            print("  - tokenizer.json")
            print("  - preprocessor_config.json")
            print("  - vocab.json")
            print("  - merges.txt")
    else:
        print("✓ 所有必要文件已存在")
    
    # 检查Python包
    print("\n3. 检查Python依赖...")
    if not check_python_packages():
        print("\n请运行以下命令安装依赖:")
        print("pip install -r requirements.txt")
    
    # 检查知识库数据
    print("\n4. 检查知识库数据...")
    data_dir = "./public/example-structuredDATA"
    
    if os.path.exists(os.path.join(data_dir, "content2.jsonl")):
        try:
            import json
            content_data = []
            with open(os.path.join(data_dir, "content2.jsonl"), 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        content_data.append(json.loads(line))
            print(f"✓ 文本数据: {len(content_data)} 条记录")
        except Exception as e:
            print(f"✗ 文本数据文件错误: {e}")
    
    if os.path.exists(os.path.join(data_dir, "image2.json")):
        try:
            import json
            with open(os.path.join(data_dir, "image2.json"), 'r', encoding='utf-8') as f:
                image_data = json.load(f)
            print(f"✓ 图片元数据: {len(image_data)} 张图片")
        except Exception as e:
            print(f"✗ 图片元数据文件错误: {e}")
    
    # 统计图片文件
    images_dir = os.path.join(data_dir, "images")
    if os.path.exists(images_dir):
        image_files = [f for f in os.listdir(images_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        print(f"✓ 图片文件: {len(image_files)} 个")
    
    # 给出下一步指示
    print("\n" + "=" * 50)
    print("环境检查完成!")
    print("\n下一步操作:")
    
    if missing_files or missing_dirs:
        print("1. 请确保所有必要文件和目录都已准备好")
    
    print("2. 构建向量数据库:")
    print("   python scripts/build_vector_database.py")
    
    print("3. 启动API服务器:")
    print("   cd scripts && python knowledge_api.py")
    
    print("4. 启动Next.js开发服务器:")
    print("   npm run dev")
    
    print("\n然后访问 http://localhost:3000/knowledge 来使用知识检索功能")

if __name__ == "__main__":
    main() 