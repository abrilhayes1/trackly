// Arranca el servidor. La aplicación se arma en app.js (así los tests la usan sin abrir el puerto).
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
