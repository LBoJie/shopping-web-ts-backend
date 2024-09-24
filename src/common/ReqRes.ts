import * as e from "express";
import jwt from "jsonwebtoken";
// **** Express **** //

export interface IReq<T = void> extends e.Request {
  body: T;
}

export interface IRes extends e.Response {
  locals: Record<string, unknown>;
}

export interface JwtReq<T = any> extends e.Request {
  body: T;
  member?: jwt.JwtPayload;
}
