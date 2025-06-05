const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

const User = require('./models/User');
const bcrypt = require('bcrypt');

const Adoption = require('./models/Adoption');
const HealthRecord = require('./models/HealthRecord');
const Veterinarian = require('./models/Veterinarian');
const MedicalProcedure = require('./models/MedicalProcedure');
const Vaccination = require('./models/Vaccination');

app.use(cors());
app.use(express.json());
app.use(express.static('Punya'));

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
  
    // Check if user is admin (for this example, we'll consider admin@happytails.com as admin)
    const isAdmin = email === 'admin@happytails.com';
  
    res.send({ 
      message: 'Login successful', 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email,
        isAdmin: isAdmin 
      } 
    });
  });

  // Submit an adoption request
app.post('/api/adoptions', async (req, res) => {
  console.log('Received adoption request:', req.body); // Log the incoming request

  const { username, petName, message } = req.body;

  // Validate required fields
  if (!username || !petName || !message) {
    console.log('Missing fields:', { username, petName, message });
    return res.status(400).send({ 
      message: 'Missing required fields. Please provide username, pet name, and a message.' 
    });
  }

  // Validate message length
  if (message.trim().length < 10) {
    console.log('Message too short:', message);
    return res.status(400).send({ 
      message: 'Please provide a more detailed message (minimum 10 characters)' 
    });
  }

  try {
    console.log('Checking if pet exists:', petName);
    // Verify that the pet exists
    const pet = await Pet.findOne({ name: petName });
    if (!pet) {
      console.log('Pet not found:', petName);
      return res.status(400).send({ message: 'Pet not found' });
    }

    console.log('Pet found:', pet);
    // Check if pet is available
    if (pet.status !== 'available') {
      console.log('Pet not available:', pet.status);
      return res.status(400).send({ message: 'Pet is not available for adoption' });
    }

    console.log('Checking for existing requests');
    // Check if user already has a pending request for this pet
    const existingRequest = await Adoption.findOne({
      username,
      petName,
      status: 'pending'
    });

    if (existingRequest) {
      console.log('Existing request found:', existingRequest);
      return res.status(400).send({ 
        message: 'You already have a pending adoption request for this pet' 
      });
    }

    console.log('Creating new adoption request');
    const adoption = new Adoption({
      username,
      petName,
      message: message.trim()
    });

    console.log('Saving adoption request');
    await adoption.save();
    console.log('Adoption request saved successfully:', adoption);

    res.status(201).send({ 
      message: 'Adoption request submitted successfully', 
      adoption: {
        username: adoption.username,
        petName: adoption.petName,
        message: adoption.message,
        status: adoption.status,
        createdAt: adoption.createdAt
      }
    });
  } catch (err) {
    console.error('Detailed adoption request error:', {
      error: err.message,
      stack: err.stack,
      requestBody: req.body
    });
    res.status(400).send({ 
      message: 'Failed to submit adoption request', 
      error: err.message 
    });
  }
});

// Get all adoption requests (optional admin route)
app.get('/api/adoptions', async (req, res) => {
  const adoptions = await Adoption.find();
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
    );

    if (!adoption) return res.status(404).send({ message: 'Request not found' });

    // If approved, update pet status to adopted
    if (status === 'approved') {
      await Pet.findOneAndUpdate(
        { name: adoption.petName },
        { status: 'adopted' }
      );
    }

    res.send({ message: `Adoption ${status}`, adoption });
  } catch (err) {
    res.status(500).send({ message: 'Failed to update status', error: err.message });
  }
});

// Health Records API Endpoints

// Get all health records
app.get('/api/health-records', async (req, res) => {
  try {
    const records = await HealthRecord.find()
      .populate('veterinarian')
      .populate('procedures')
      .populate('vaccinations')
      .sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).send({ message: 'Error fetching health records', error: err.message });
  }
});

// Get all health records for a pet
app.get('/api/health-records/:petName', async (req, res) => {
  try {
    const records = await HealthRecord.find({ petName: req.params.petName })
      .populate('veterinarian')
      .populate('procedures')
      .populate('vaccinations')
      .sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).send({ message: 'Error fetching health records', error: err.message });
  }
});

// Create a new health record
app.post('/api/health-records', async (req, res) => {
  try {
    const record = new HealthRecord(req.body);
    await record.save();
    res.status(201).json(record);
  } catch (err) {
    res.status(400).send({ message: 'Error creating health record', error: err.message });
  }
});

// Update a health record
app.put('/api/health-records/:id', async (req, res) => {
  try {
    const record = await HealthRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!record) return res.status(404).send({ message: 'Health record not found' });
    res.json(record);
  } catch (err) {
    res.status(400).send({ message: 'Error updating health record', error: err.message });
  }
});

// Get health trends for a pet
app.get('/api/health-records/:petName/trends', async (req, res) => {
  try {
    const timeRange = parseInt(req.query.months) || 6; // Default to 6 months
    const trends = await HealthRecord.getHealthTrends(req.params.petName, timeRange);
    res.json(trends);
  } catch (err) {
    res.status(500).send({ message: 'Error fetching health trends', error: err.message });
  }
});

// Get upcoming vaccinations for a pet
app.get('/api/health-records/:petName/vaccinations', async (req, res) => {
  try {
    const vaccinations = await HealthRecord.getUpcomingVaccinations(req.params.petName);
    res.json(vaccinations);
  } catch (err) {
    res.status(500).send({ message: 'Error fetching vaccinations', error: err.message });
  }
});

// Veterinarian API Endpoints

// Get all veterinarians
app.get('/api/veterinarians', async (req, res) => {
  try {
    const vets = await Veterinarian.find();
    res.json(vets);
  } catch (err) {
    res.status(500).send({ message: 'Error fetching veterinarians', error: err.message });
  }
});

// Add a new veterinarian
app.post('/api/veterinarians', async (req, res) => {
  try {
    const vet = new Veterinarian(req.body);
    await vet.save();
    res.status(201).json(vet);
  } catch (err) {
    res.status(400).send({ message: 'Error adding veterinarian', error: err.message });
  }
});

// Find available veterinarians
app.get('/api/veterinarians/available', async (req, res) => {
  try {
    const { date, specialization } = req.query;
    const vets = await Veterinarian.findAvailable(new Date(date), specialization);
    res.json(vets);
  } catch (err) {
    res.status(500).send({ message: 'Error finding available veterinarians', error: err.message });
  }
});

// Medical Procedures API Endpoints

// Get all medical procedures
app.get('/api/procedures', async (req, res) => {
  try {
    const { category, specialization } = req.query;
    const procedures = await MedicalProcedure.findByCategoryAndSpecialization(category, specialization);
    res.json(procedures);
  } catch (err) {
    res.status(500).send({ message: 'Error fetching procedures', error: err.message });
  }
});

// Add a new medical procedure
app.post('/api/procedures', async (req, res) => {
  try {
    const procedure = new MedicalProcedure(req.body);
    await procedure.save();
    res.status(201).json(procedure);
  } catch (err) {
    res.status(400).send({ message: 'Error adding procedure', error: err.message });
  }
});

// Get procedure statistics
app.get('/api/procedures/stats', async (req, res) => {
  try {
    const timeRange = parseInt(req.query.months) || 12; // Default to 12 months
    const stats = await MedicalProcedure.getProcedureStats(timeRange);
    res.json(stats);
  } catch (err) {
    res.status(500).send({ message: 'Error fetching procedure statistics', error: err.message });
  }
});

// Vaccination API Endpoints

// Get all vaccinations
app.get('/api/vaccinations', async (req, res) => {
  try {
    const vaccinations = await Vaccination.find({ isActive: true });
    res.json(vaccinations);
  } catch (err) {
    res.status(500).send({ message: 'Error fetching vaccinations', error: err.message });
  }
});

// Add a new vaccination
app.post('/api/vaccinations', async (req, res) => {
  try {
    const vaccination = new Vaccination(req.body);
    await vaccination.save();
    res.status(201).json(vaccination);
  } catch (err) {
    res.status(400).send({ message: 'Error adding vaccination', error: err.message });
  }
});

// Get vaccination schedule for a pet
app.get('/api/vaccinations/schedule/:petName', async (req, res) => {
  try {
    const { species, age } = req.query;
    const schedule = await Vaccination.getVaccinationSchedule(req.params.petName, species, age);
    res.json(schedule);
  } catch (err) {
    res.status(500).send({ message: 'Error fetching vaccination schedule', error: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

