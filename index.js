const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const nodemailer = require('nodemailer');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.yaml');

const app = express();
const port = 3000;

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Create a MySQL connection
const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: '',
});

// Nodemailer configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'testuser@gmail.com', // Replace with your email
        pass: 'password123', // Replace with your email password
    },
});

// Middleware to parse JSON and handle URL encoded forms
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (you may need to adjust the path based on your project structure)
app.use(express.static('public'));

// Define a route for handling form submissions
// Route to handle form submissions
app.post('/submitForm', (req, res) => {
    const { input1: vin, input2: make, input3: model, input4: year } = req.body;

    // Validate the data
    if (!vin || vin.length !== 17 || !/^[a-zA-Z0-9]+$/.test(vin)) {
        return res.status(400).json({ error: 'Invalid VIN. Must be 17 characters long and contain only letters and numbers.' });
    }

    if (!make || !/^[a-zA-Z]+$/.test(make) || make.length > 30) {
        return res.status(400).json({ error: 'Invalid Make. Must contain only letters and be less than 30 characters.' });
    }

    if (!model || model.length > 30) {
        return res.status(400).json({ error: 'Invalid Model. Must be less than 30 characters.' });
    }

    if (!year || !/^(19|20)\d{2}$/.test(year)) {
        return res.status(400).json({ error: 'Invalid Year. Must be a 4-digit number starting with 19 or 20.' });
    }

    // Save form data to the MySQL database
    connection.query('INSERT INTO formData (vin, make, model, year) VALUES (?, ?, ?, ?)', [vin, make, model, year], (error, results, fields) => {
        if (error) {
            console.error('Error saving form data to database:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        // Send confirmation email to the user
        const userMailOptions = {
            from: 'testuser@gmail.com', // Replace with your email
            to: req.body.email, // Assuming you have an 'email' field in your form
            subject: 'Request Submitted Successfully',
            text: 'Thank you for submitting your request. We will get back to you soon!',
        };

        transporter.sendMail(userMailOptions, (error, info) => {
            if (error) {
                console.error('Error sending confirmation email to user:', error);
            } else {
                console.log('Confirmation email sent to user:', info.response);
            }
        });

        // Send notification email to the owner
        const ownerMailOptions = {
            from: 'testuser@gmail.com', // Replace with your email
            to: 'admin@example.com', // Replace with owner's email
            subject: 'New Request Received',
            text: `A new request has been received.\nVIN: ${vin}\nMake: ${make}\nModel: ${model}\nYear: ${year}`,
        };

        transporter.sendMail(ownerMailOptions, (error, info) => {
            if (error) {
                console.error('Error sending notification email to owner:', error);
            } else {
                console.log('Notification email sent to owner:', info.response);
            }
        });

        res.status(200).json({ message: 'Form submitted successfully!' });
    });
});

// Default route to serve your HTML file
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html'); // Update the path if needed
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
