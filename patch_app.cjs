const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /const handleDeleteListing = async \(listingId: string\) => \{[\s\S]*?    \};/g,
  `const handleDeleteListing = async (listingId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this listing from the database? This action cannot be undone.')) {
      try {
        await api.deleteListing(listingId);
        alert('Listing permanently deleted.');
        navigate('/');
        loadCoreData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };`
);

fs.writeFileSync('src/App.tsx', code);
