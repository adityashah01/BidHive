const fs = require('fs');
let code = fs.readFileSync('src/components/LeafletMap.tsx', 'utf8');

const searchFunc = `  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const res = await fetch(\`https://nominatim.openstreetmap.org/search?format=json&q=\${encodeURIComponent(searchQuery + ', Kathmandu, Nepal')}&limit=1\`);
      const data = await res.json();
      if (data && data.length > 0) {
        updateLocation(parseFloat(data[0].lat), parseFloat(data[0].lon), data[0].display_name.split(',')[0] + ', Kathmandu');
      } else {
        const res2 = await fetch(\`https://nominatim.openstreetmap.org/search?format=json&q=\${encodeURIComponent(searchQuery + ', Nepal')}&limit=1\`);
        const data2 = await res2.json();
        if (data2 && data2.length > 0) {
          updateLocation(parseFloat(data2[0].lat), parseFloat(data2[0].lon), data2[0].display_name.split(',')[0]);
        } else {
          // Fallback
          const latOffset = (Math.random() - 0.5) * 0.04;
          const lngOffset = (Math.random() - 0.5) * 0.04;
          updateLocation(27.700769 + latOffset, 85.316853 + lngOffset, \`\${searchQuery} (Approximate)\`);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };`;

// Replace handleSearch
code = code.replace(
  /const handleSearch = \(e: React\.FormEvent\) => \{[\s\S]*?  \};/,
  searchFunc
);

// Replace onKeyDown logic
code = code.replace(
  /onKeyDown=\{\(e\) => \{[\s\S]*?\}\}/,
  `onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}`
);

// Replace button onClick logic
code = code.replace(
  /onClick=\{\(\) => \{\s+if \(searchQuery\.trim\(\)\) \{[\s\S]*?\}\s+\}\s+\}/,
  `onClick={() => handleSearch()}`
);

fs.writeFileSync('src/components/LeafletMap.tsx', code);
