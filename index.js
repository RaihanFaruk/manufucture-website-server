const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;
// middlewire
const corsConfig = {
    origin: true,
    credentials: true,
}

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}

const emailSenderOptions = {
    auth: {
        api_key: process.env.EMAIL_SENDER_KEY
    }
}
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jlzrp.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const run = async () => {

    try {
        await client.connect();
        const productCollenction = client.db("ToolsStock").collection("products");
        const userCollenction = client.db("ToolsStock").collection("users");
        const reviewCollenction = client.db("ToolsStock").collection("reviews");
        const orderCollenction = client.db("ToolsStock").collection("orders");
        const paymentCollenction = client.db("ToolsStock").collection("payments");

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollenction.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: 'forbidden' });
            }
        }

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const order = req.body;
            const price = order.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });

        app.get('/product', async (req, res) => {
            const query = {};
            const products = await productCollenction.find(query).toArray();
            res.send(products)   })

            app.get('/product/:id', async (req, res) => {
                const id = req.params.id;
                const query = { _id: ObjectId(id) };
                const product = await productCollenction.findOne(query)
                res.send(product)
            })     const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollenction.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '3h' })
            res.send({ result, token });
        });

        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const user = await userCollenction.findOne(filter);
            res.send(user);
