const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

const User = require('./models/User');
const bcrypt = require('bcrypt');

const Adoption = require('./models/Adoption');



app.use(cors());
app.use(express.json());
app.use(express.static('public'));

mongoose.connect('mongodb+srv://1by23is101:6SHMqBU4k0ndbedN@cluster0.sfxvlph.mongodb.net/Pet', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schema
const Pet = require('./models/Pet');

// Routes
app.post('/api/pets', async (req, res) => {
  const pet = new Pet(req.body);
  await pet.save();
  res.status(201).send({ message: 'Pet added successfully', pet });
});

app.get('/api/pets', async (req, res) => {
  const pets = await Pet.find();
  res.send(pets);
});

// Register
app.post('/api/register', async (req, res) => {
    try {
      const user = new User(req.body);
      await user.save();
      res.status(201).send({ message: 'User registered successfully' });
    } catch (err) {
      res.status(400).send({ message: 'Registration failed', error: err.message });
    }
  });
  
  // Login
  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).send({ message: 'Invalid email or password' });
  
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).send({ message: 'Invalid email or password' });
  
    res.send({ message: 'Login successful', user: { id: user._id, name: user.name, email: user.email } });
  });

  // Submit an adoption request
app.post('/api/adoptions', async (req, res) => {
    const { userId, petId, message } = req.body;
  
    try {
      const adoption = new Adoption({ userId, petId, message });
      await adoption.save();
      res.status(201).send({ message: 'Adoption request submitted', adoption });
    } catch (err) {
      res.status(400).send({ message: 'Failed to submit adoption request', error: err.message });
    }
  });
  
  // Get all adoption requests (optional admin route)
  app.get('/api/adoptions', async (req, res) => {
    const adoptions = await Adoption.find().populate('userId petId');
    res.send(adoptions);
  });
  
  // Update adoption status (admin only)
app.put('/api/adoptions/:id/status', async (req, res) => {
    const { status } = req.body; // expected: 'approved' or 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).send({ message: 'Invalid status' });
    }
  
    try {
      const adoption = await Adoption.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      ).populate('userId petId');
  
      if (!adoption) return res.status(404).send({ message: 'Request not found' });
  
      res.send({ message: `Adoption ${status}`, adoption });
    } catch (err) {
      res.status(500).send({ message: 'Failed to update status', error: err.message });
    }
  });
  
  

// Start Server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

