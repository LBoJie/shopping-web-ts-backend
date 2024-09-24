import jwt from "jsonwebtoken";

require("dotenv").config();
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!; // 秘钥，可以使用更复杂的随机字符串
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;

export const generateAccessToken = (payload: jwt.JwtPayload): string => {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: "1d" }); // 1天有效期
};

export const verifyAccessToken = (token: string) => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as jwt.JwtPayload;
  } catch (error: any) {
    return null;
  }
};

export const generateRefreshToken = (payload: jwt.JwtPayload): string => {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: "7d" }); // 7天有效期
};

export const verifyRefreshToken = (token: string): jwt.JwtPayload | null => {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as jwt.JwtPayload | null;
  } catch (error) {
    return null;
  }
};
