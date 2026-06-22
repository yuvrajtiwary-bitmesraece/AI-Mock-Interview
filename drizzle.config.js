/** @type {import("dirzzle-kit").Config} */
export default {
    schema: "./utils/schema.js",
    dialect: 'postgresql',
    dbCredentials:{
        url: 'postgresql://neondb_owner:npg_DnkZUeXALP26@ep-sparkling-unit-at5flrw4-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    }
};