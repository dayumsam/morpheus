// Prepare graph data from nodes and links
export function formatGraphData(graphData: any) {
  if (!graphData || !graphData.nodes || !graphData.links) {
    return { nodes: [], links: [] };
  }

  // Create a map to store node ids for quick lookup
  const nodeMap = new Map();
  graphData.nodes.forEach((node: any) => {
    nodeMap.set(node.id, true);
  });

  // Filter links to include only those with valid source and target nodes
  const validLinks = graphData.links.filter((link: any) => {
    return nodeMap.has(link.source) && nodeMap.has(link.target);
  });

  return {
    nodes: graphData.nodes,
    links: validLinks,
  };
}

// Group nodes by their categories (for stats display)
export function groupNodesByType(nodes: any[]) {
  const groups: Record<string, number> = {
    note: 0,
    link: 0,
  };
  
  if (!nodes) return groups;
  
  nodes.forEach((node) => {
    if (node.type && groups[node.type] !== undefined) {
      groups[node.type]++;
    }
  });
  
  return groups;
}

// Count connections between nodes
export function countConnections(links: any[]) {
  return links?.length || 0;
}

// Calculate node connectivity statistics
export function calculateNodeStats(nodes: any[], links: any[]) {
  if (!nodes || !links) {
    return {
      mostConnected: null,
      averageConnections: 0,
    };
  }
  
  // Count connections per node
  const connectionCounts: Record<string, number> = {};
  
  links.forEach((link) => {
    const source = typeof link.source === 'object' ? link.source.id : link.source;
    const target = typeof link.target === 'object' ? link.target.id : link.target;
    
    connectionCounts[source] = (connectionCounts[source] || 0) + 1;
    connectionCounts[target] = (connectionCounts[target] || 0) + 1;
  });
  
  // Find the most connected node
  let mostConnectedId = null;
  let maxConnections = 0;
  
  Object.entries(connectionCounts).forEach(([nodeId, count]) => {
    if (count > maxConnections) {
      mostConnectedId = nodeId;
      maxConnections = count;
    }
  });
  
  // Find the most connected node object
  const mostConnected = mostConnectedId 
    ? nodes.find(node => node.id === mostConnectedId) 
    : null;
  
  // Calculate average connections per node
  const totalConnections = Object.values(connectionCounts).reduce((sum, count) => sum + count, 0);
  const nodeCount = Object.keys(connectionCounts).length;
  const averageConnections = nodeCount ? (totalConnections / nodeCount).toFixed(1) : '0';
  
  return {
    mostConnected,
    averageConnections,
  };
}
