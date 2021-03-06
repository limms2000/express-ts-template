import Logger from "../../../config/logger";
import pool from "../../../config/database";
import { secret_config } from "../../../config/secret";
import * as userDao from "./userDao";
import * as userProvider from "./userProvider"

import baseResponse from "../../../config/baseResponseStatus";
import {response} from "../../../config/response";

import jwt from "jsonwebtoken";
import crypto from "crypto";

// Service: Create, Update, Delete 비즈니스 로직 처리
const createUser = async function (email:string, password:string, nickname:string) {
    try {
        const connection = await (await pool).getConnection();
        // 트랜잭션 처리
        await connection.beginTransaction();
        try {
        
            // 이메일 중복 확인
            const emailRows = await userProvider.emailCheck(email);
            if (emailRows.length > 0)
                return response(baseResponse.SIGNUP_REDUNDANT_EMAIL);
    
            // 비밀번호 암호화
            const hashedPassword = await crypto
                .createHash("sha512")
                .update(password)
                .digest("hex");
    
            const insertUserInfoParams = [email, hashedPassword, nickname];
            
            
    
            // 유저 생성
            await userDao.insertUserInfo(connection, insertUserInfoParams);
    
            // DB 트랜잭션 Commit
            await connection.commit();
            await connection.release();
            Logger.info(`App - email : ${email} posted user`);
            return response(baseResponse.SUCCESS);
    
        } catch (err) {
            connection.rollback();
            Logger.error(`App - createUser Service Query error\n: ${err.message} \n ${err}`);
            return response(baseResponse.QUERY_ERROR);
        }
    } catch(err) {
        Logger.error(`App - createUser Service DB error\n: ${err.message} \n ${err}`);
        return response(baseResponse.DB_ERROR);
    }
};


// TODO: After 로그인 인증 방법 (JWT)
const postSignIn = async function (email:string, password:string) {
    try {
        // 이메일 여부 확인
        const emailRows = await userProvider.emailCheck(email);
        console.log(`email Rows : `,emailRows);
        if (emailRows.length < 1) return response(baseResponse.SIGNIN_EMAIL_WRONG);
        
        const selectEmail = emailRows[0].email;

        // 비밀번호 확인
        const hashedPassword = await crypto
            .createHash("sha512")
            .update(password)
            .digest("hex");

        const selectUserPasswordParams = [selectEmail, hashedPassword];
        const passwordRows = await userProvider.passwordCheck(selectUserPasswordParams);
        console.log(`password Rows : `,passwordRows);
        if(passwordRows.length<1) return response(baseResponse.SIGNIN_PASSWORD_WRONG);
        if (passwordRows[0].password !== hashedPassword) {
            return response(baseResponse.SIGNIN_PASSWORD_WRONG);
        }

        // 계정 상태 확인
        const userInfoRows = await userProvider.accountCheck(email);

        if (userInfoRows[0].status === "INACTIVE") {
            return response(baseResponse.SIGNIN_INACTIVE_ACCOUNT);
        } else if (userInfoRows[0].status === "DELETED") {
            return response(baseResponse.SIGNIN_WITHDRAWAL_ACCOUNT);
        }

        console.log(`user Rows : `,userInfoRows) // DB의 userId

        //토큰 생성 Service
        let token = await jwt.sign(
            {
                userIdx: userInfoRows[0].idx,
            }, // 토큰의 내용(payload)
            secret_config.secret, // 비밀키
            {
                expiresIn: "365d",
                subject: "userInfo",
            } // 유효 기간 365일
        );

        return response(baseResponse.SUCCESS, {'userId': userInfoRows.idx, 'jwt': token});

    } catch (err) {
        Logger.error(`App - postSignIn Service error\n: ${err.message} \n${JSON.stringify(err)}`);
        return response(baseResponse.DB_ERROR);
    }
};

const editUser = async function (id:string, nickname:string) {
    try {
        const connection = await (await pool).getConnection();
        try {
            console.log(id)
            const editUserResult = await userDao.updateUserInfo(connection, id, nickname);
            console.log(`추가된 회원 : ${editUserResult}`);
            
            connection.release();
    
            return response(baseResponse.SUCCESS);

        } catch (err) {
            Logger.error(`App - editUser Service Query error\n: ${err.message}`);
            return response(baseResponse.QUERY_ERROR);
        }
    } catch (err) {
        Logger.error(`App - editUser Service DB error\n: ${err.message}`);
        return response(baseResponse.DB_ERROR);
    }
    
}

export {createUser, postSignIn, editUser}