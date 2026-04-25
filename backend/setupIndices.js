const INDEX_NAME = 'products';
const ES_URL = 'http://127.0.0.1:9200';

async function esFetch(path, options = {}) {
    if (!options.headers) options.headers = {};
    if (!options.headers['Content-Type'] && options.body && typeof options.body === 'string') {
        if (!options.body.split('\n').every(l => l.startsWith('{') || l === '')) {
            // Bulk ndjson
            options.headers['Content-Type'] = 'application/x-ndjson';
        } else {
            options.headers['Content-Type'] = 'application/json';
        }
    }
    
    const res = await fetch(`${ES_URL}${path}`, options);
    if (!res.ok && res.status !== 404) {
        throw new Error(`ES Error ${res.status}: ${await res.text()}`);
    }
    return { ok: res.ok, status: res.status, json: await res.json().catch(()=>({})) };
}

// Mock Data Generation
const generateDummyData = () => {
    const brands = ['Apple', 'Samsung', 'Dell', 'HP', 'Lenovo', 'Sony', 'LG', 'Asus', 'Acer', 'Microsoft'];
    const categories = ['Laptop', 'Smartphone', 'Tablet', 'Monitor', 'Headphone', 'Smartwatch', 'Camera', 'Speaker'];
    const adjectives = ['Pro', 'Max', 'Ultra', 'Plus', 'Mini', 'Lite', 'Air', 'Gaming'];
    
    const products = [];
    let id = 1;

    // Fixed realistic examples for good search highlights
    const fixedProducts = [
        { id: id++, name: 'iPhone 15 Pro Max 256GB', brand: 'Apple', category: 'Smartphone', description: 'The latest iPhone with A17 Pro chip, titanium design, and 48MP main camera.', price: 1199 },
        { id: id++, name: 'iPhone 14 Plus 128GB', brand: 'Apple', category: 'Smartphone', description: 'A great iPhone with larger 6.7-inch display and amazing battery life.', price: 899 },
        { id: id++, name: 'MacBook Air M2', brand: 'Apple', category: 'Laptop', description: 'Supercharged by M2 chip. Thin, light and powerful laptop.', price: 999 },
        { id: id++, name: 'MacBook Pro 14 M3', brand: 'Apple', category: 'Laptop', description: 'Powerful laptop for professionals with M3 Pro or M3 Max chip.', price: 1599 },
        { id: id++, name: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', category: 'Smartphone', description: 'AI powered smartphone with titanium frame and 200MP camera.', price: 1299 },
        { id: id++, name: 'Samsung Galaxy Z Fold 5', brand: 'Samsung', category: 'Smartphone', description: 'Unfold an expansive screen. The ultimate productivity fold phone.', price: 1799 },
        { id: id++, name: 'Dell XPS 15', brand: 'Dell', category: 'Laptop', description: 'Premium 15-inch laptop with InfinityEdge display and high performance.', price: 1499 },
        { id: id++, name: 'Sony WH-1000XM5', brand: 'Sony', category: 'Headphone', description: 'Industry leading noise canceling wireless headphones.', price: 398 },
    ];
    
    products.push(...fixedProducts);

    // Generate random ones to make the dataset larger
    for (let i = 0; i < 500; i++) {
        const brand = brands[Math.floor(Math.random() * brands.length)];
        const category = categories[Math.floor(Math.random() * categories.length)];
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const modelNumbers = Math.floor(Math.random() * 9000) + 1000;
        
        products.push({
            id: id++,
            name: `${brand} ${category} ${adjective} ${modelNumbers}`,
            brand: brand,
            category: category,
            description: `This is a high quality ${category.toLowerCase()} from ${brand}. Features include amazing performance, sleek design, and the latest technology. Perfect for your daily needs.`,
            price: Math.floor(Math.random() * 1500) + 100
        });
    }
    
    return products;
};

async function setup() {
    try {
        console.log(`Checking if index "${INDEX_NAME}" exists...`);
        const { status } = await esFetch(`/${INDEX_NAME}`);

        if (status === 200) {
            console.log(`Index "${INDEX_NAME}" exists. Deleting...`);
            await esFetch(`/${INDEX_NAME}`, { method: 'DELETE' });
        }

        console.log(`Creating index "${INDEX_NAME}" with custom settings and mappings...`);
        const createRes = await esFetch(`/${INDEX_NAME}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mappings: {
                    properties: {
                        id: {
                            type: 'keyword'
                        },
                        product_name: {
                            type: 'search_as_you_type'
                        },
                        description: {
                            type: 'text'
                        },
                        brand: {
                            type: 'keyword'
                        },
                        category: {
                            type: 'keyword'
                        },
                        price: {
                            type: 'float'
                        }
                    }
                }
            })
        });
        
        console.log('Index created successfully!', createRes.json);
        
        console.log('Generating dummy data...');
        const dataset = generateDummyData();
        // Cập nhật trường name thành product_name cho khớp với schema mới
        const formattedDataset = dataset.map(d => {
            const doc = { ...d, product_name: d.name };
            delete doc.name;
            return doc;
        });
        
        console.log(`Ingesting ${formattedDataset.length} documents...`);
        
        let bulkBody = '';
        formattedDataset.forEach(doc => {
            bulkBody += JSON.stringify({ index: { _id: String(doc.id), _index: INDEX_NAME } }) + '\n';
            bulkBody += JSON.stringify(doc) + '\n';
        });
        
        const bulkRes = await esFetch(`/${INDEX_NAME}/_bulk?refresh=true`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-ndjson' },
            body: bulkBody
        });
        
        console.log('Successfully ingested data!', bulkRes.json.errors ? 'WITH ERRORS' : 'NO ERRORS');

    } catch (error) {
        console.error('Error in setup:', error);
    }
}

setup();
