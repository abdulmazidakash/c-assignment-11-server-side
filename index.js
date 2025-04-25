const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config()
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cookieParser = require('cookie-parser');

const corsOptions = {
	origin: ['http://localhost:5173', 'http://localhost:5174', 'https://assignment-11-artifact-atlas.netlify.app', 'https://assignment-11-9dd66.firebaseapp.com', 'https://assignment-11-9dd66.web.app'],
	credentials: true,
	optionalSuccessStatus: 200,
}

//middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j0hxo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//verify token
const verifyToken = (req, res, next) =>{
	const token = req.cookies?.token;

	if(!token) return res.status(401).send({message: 'unauthorized access'})
		jwt.verify(token, process.env.SECRET_KEY, (err, decoded) =>{
			if(err){
				return res.status(401).send({message: 'unauthorized access'})
			}
			req.user = decoded
	})
	next();
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

	const db = client.db('artifact-db');
	const artifactCollection = db.collection('artifacts');
	const likedCollection = db.collection('liked');

	//generate jwt
	app.post('/jwt', async(req, res) =>{
		const email = req.body;

		//create token
		const token = jwt.sign(email, process.env.SECRET_KEY, {
			expiresIn: '365d',
		})

		// res.send(token);
		res.cookie('token', token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',

		}).send({ success: true})
	})

	//logout || clear cookie from browser
	app.get('/logout', async(req, res)=>{
		res
		.clearCookie('token', {
			maxAge: 0,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
		})
		.send({success: true})
	})

	// Fetch featured 6 artifact Cards
    app.get("/featured-artifact", async (req, res) => {
		const mostLike = await artifactCollection.find().sort({ like_count: -1 }).limit(6).toArray();
		res.json(mostLike);
	  });
	  

	//save a add artifact data in db
	app.post('/add-artifact', verifyToken, async(req, res) =>{
		const artifactData = req.body
		const result = await artifactCollection.insertOne(artifactData);
		res.send(result)
	})

	// get all artifacts data from db
	app.get('/artifacts', async (req, res) => {
		const search = req.query.search || ''; // Default to an empty string if not provided
		let query = {};
	  
		// Only add the $regex filter if search is a non-empty string
		if (search.trim()) {
		  query = {
			name: {
			  $regex: search.trim(), // Ensure it's a valid string
			  $options: 'i', // Case-insensitive
			},
		  };
		}
	  
		try {
		  const result = await artifactCollection.find(query).toArray();
		  res.send(result);
		} catch (error) {
		  console.error('Error fetching artifacts:', error);
		  res.status(500).send({ message: 'Internal Server Error' });
		}
	  });
	  
	//get all artifacts posted by a specific user
	app.get('/artifacts/:email', verifyToken, async(req, res)=>{

		const email = req.params.email;
		const decodedEmail = req.user?.email;

		console.log('email from token--->', decodedEmail);
		console.log('email from params--->', email);

		if(decodedEmail !== email) 
			return res.status.send({message: 'unauthorize access'})
		const query = { adderEmail: email};
		const result = await artifactCollection.find(query).toArray();
		res.send(result);
	})


	//delete a artifact from db
	app.delete('/artifact/:id', verifyToken, async(req, res)=>{
		const id = req.params.id;
		const query = {_id: new ObjectId(id)};
		const result = await artifactCollection.deleteOne(query);
		res.send(result);
	})

	//get a single job data by id from db update
	app.get('/artifact/:id', verifyToken, async(req, res)=>{
		const id = req.params.id;
		const query = { _id: new ObjectId(id)};
		const result = await artifactCollection.findOne(query);
		res.send(result);
	})

	//update data from db specific user
	app.put('/update-artifact/:id', verifyToken, async(req, res) =>{
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

	  
	//save a liked data in db
	app.post('/add-like', verifyToken, async(req, res)=>{
		// 1.save data in liked collection
		const likedData = req.body;

		//if a user placed a like already in this artifact
		const query = { email: likedData.email, artifactId: likedData.artifactId};
		const alreadyExist = await likedCollection.findOne(query);
		console.log('if already exist---->', alreadyExist);

		if(alreadyExist)
			return res
			.status(400)
			.send('you already placed a like on this artifact')
		const result = await likedCollection.insertOne(likedData);

		//2. increase like count in artifact collection
		const filter = { _id: new ObjectId(likedData.artifactId)};
		const update = {
			$inc: {like_count: 1},
		}
		const updateLikeCount = await artifactCollection.updateOne(filter, update)
		console.log(result);
		res.send(result);
	})

	//get all like for a specific user
	 app.get('/liked/:email', verifyToken, async(req, res)=>{
		const email = req.params.email;
		const decodedEmail = req.user?.email;

		if(decodedEmail !== email) 
			return res.status.send({message: 'unauthorize access'})
		const query = { email };
		const result = await likedCollection.find(query).toArray();
		res.send(result);
	 })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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