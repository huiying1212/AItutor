// 图谱数据转换函数
export function transformDataToElements(graphData: any) {
  const nodes = graphData?.keyinfo || [];
  const edges = graphData?.connections || [];
  const elements: any[] = [];
  const degreeMap: { [key: string]: number } = {};

  nodes.forEach((node: any) => {
    degreeMap[node.id] = 0;
  });

  edges.forEach((edge: any) => {
    degreeMap[edge.from] = (degreeMap[edge.from] || 0) + 1; 
    degreeMap[edge.to] = (degreeMap[edge.to] || 0) + 1;     
    elements.push({
      data: {
        id: `${edge.from}-${edge.to}`,
        source: edge.from, 
        target: edge.to,
        label: edge.relationship,
      },
    });
  });

  const degrees = Object.values(degreeMap);
  const maxDegree = Math.max(...degrees);
  const minDegree = Math.min(...degrees);

  // 根据度设置节点大小
  nodes.forEach((node: any) => {
    const degree = degreeMap[node.id];
    const hasImage = node.image && node.image.trim() !== "";
    const size = hasImage 
      ? 100 + ((degreeMap[node.id] - minDegree) / (maxDegree - minDegree || 1)) * 100 
      : 20; // 没有图片的节点设置很小的大小

    // 父节点
    elements.push({
      data: {
        id: node.id, 
        keyword: node.keyword,
      },
      classes: 'keyword-node', 
    });

    // 子节点 - 只有当有图片时才设置image属性
    const childData: any = {
      id: `${node.id}-child`,
      parent: node.id, 
      degree: degree,
      size: size,
      details: `★ ${node.keyword.toUpperCase()}` + 
               (node.description ? `\n\n${node.description}` : '') + 
               (node.otherinfo ? `\n\n${node.otherinfo}` : ''),
      keyword: node.keyword,
      description: node.description || '',
      otherinfo: node.otherinfo || '',
      isExtendedInfo: node.isExtendedInfo,
    };

    // 只有当有图片时才添加image属性
    if (hasImage) {
      childData.image = `/images/${node.image}`;
    }

    // 根据是否有图片和扩展信息决定类名
    let nodeClass;
    if (!hasImage) {
      // 没有图片的节点使用text-only类
      nodeClass = node.isExtendedInfo === 1 ? 'text-only-extended-node' : 'text-only-node';
    } else {
      // 有图片的节点使用原来的类
      nodeClass = node.isExtendedInfo === 1 ? 'extended-node' : 'detail-node';
    }

    elements.push({
      data: childData,
      classes: nodeClass, 
    });
  });

  return elements;
}

// 通知显示函数
export function showNotification(message: string, type: string = 'info') {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: ${type === 'success' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #ef4444, #dc2626)'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-weight: 500;
    animation: slideInRight 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  // 3秒后自动移除
  setTimeout(() => {
    notification.style.animation = 'slideInRight 0.3s ease-out reverse';
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}
