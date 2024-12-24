const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const corsOptions = {
	origin: ['http://localhost:5173', 'http://localhost:5174'],
	credentials: true,
	optionalSuccessStatus: 200,
}

//middleware
app.use(cors(corsOptions));
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j0hxo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

	const db = client.db('artifact-db')
	const artifactCollection = db.collection('artifacts')

	//save a add artifact data in db
	app.post('/add-artifact', async(req, res) =>{
		const artifactData = req.body
		const result = await artifactCollection.insertOne(artifactData)

		// console.log(result)
		res.send(result)
	})

	//get all artifacts data from db
	app.get('/artifacts', async(req, res)=>{
		const result = await artifactCollection.find().toArray();
		res.send(result);
	})

	//get all artifacts posted by a specific user
	app.get('/artifacts/:email', async(req, res)=>{
		const email = req.params.email;
		const query = { adderEmail: email};
		const result = await artifactCollection.find(query).toArray();
		res.send(result);
	})


	//delete a artifact from db
	app.delete('/artifact/:id', async(req, res)=>{
		const id = req.params.id;
		const query = {_id: new ObjectId(id)};
		const result = await artifactCollection.deleteOne(query);
		res.send(result);
	})

	//get a single job data by id from db update
	app.get('/artifact/:id', async(req, res)=>{
		const id = req.params.id;
		const query = { _id: new ObjectId(id)};
		const result = await artifactCollection.findOne(query);
		res.send(result);
	})

	//update data from db specific user
	app.put('/update-artifact/:id', async(req, res) =>{
		const id = req.params.id;
		const artifactData = req.body;
		const updated = {
			$set: artifactData,
		}
		const query = { _id: new ObjectId(id)};
		const options = { upsert: true};
		const result = await artifactCollection.updateOne(query, updated, options);

		console.log(result);
		res.send(result);
	})

	  



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



//
app.get('/', (req, res)=>{
	res.send('artifacts atlas server is running')
})


//
app.listen(port, ()=>{
	console.log(`job is running for Port: ${port}`);
})