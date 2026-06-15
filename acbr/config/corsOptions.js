const parseAllowedOrigins = () =>
  String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const allowedOrigins = parseAllowedOrigins();

export const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origem não permitida pelo CORS."));
  },
  credentials: true,
};

export default corsOptions;
