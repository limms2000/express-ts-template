import promiseMysql from 'promise-mysql';
import * as dotenv from 'dotenv';

dotenv.config();

// TODO: 본인의 DB 계정 입력

const pool:any = promiseMysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB
});

export default pool;