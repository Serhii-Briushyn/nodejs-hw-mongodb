import { OAuth2Client } from "google-auth-library";
import path from "node:path";
import { readFile } from "node:fs/promises";
import createHttpError from "http-errors";
import { env } from "./env.js";

const PATH_JSON = path.join(process.cwd(), "config", "google-oauth.json");

const oauthConfig = JSON.parse(await readFile(PATH_JSON));

const redirectUri =
  env("NODE_ENV") === "production"
    ? oauthConfig.web.redirect_uris[1]
    : oauthConfig.web.redirect_uris[0];

const googleOAuthClient = new OAuth2Client({
  clientId: env("GOOGLE_AUTH_CLIENT_ID"),
  clientSecret: env("GOOGLE_AUTH_CLIENT_SECRET"),
  redirectUri,
});

export const generateAuthUrl = () =>
  googleOAuthClient.generateAuthUrl({
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
  });

export const validateCode = async (code) => {
  const response = await googleOAuthClient.getToken(code);
  if (!response.tokens.id_token) throw createHttpError(401, "Unauthorized");

  const ticket = await googleOAuthClient.verifyIdToken({
    idToken: response.tokens.id_token,
  });
  return ticket;
};

export const getFullNameFromGoogleTokenPayload = (payload) => {
  let fullName = "Guest";
  if (payload.given_name && payload.family_name) {
    fullName = `${payload.given_name} ${payload.family_name}`;
  } else if (payload.given_name) {
    fullName = payload.given_name;
  }

  return fullName;
};