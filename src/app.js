const express = require('express');
const PORT = process.env.PORT || 8080;
const router = require('./routes/routes');
const app = express();
app.use(express.json());

app.use('/api', router);

app.listen(PORT, () => {
	console.log(`server running on port http://localhost:${PORT}`);
});
