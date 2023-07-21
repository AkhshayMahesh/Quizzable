
const mysql = require('mysql2');

const connection = mysql.createConnection(  {
	host : 'localhost',
	database : 'mydb',
	user : 'root',
	password : 'mysql'
});

connection.connect(function(error){
	if(error)
	{
		console.log(error);
	}
	else
	{
		console.log('MySQL Database is connected Successfully');
	}
});

module.exports = connection;

