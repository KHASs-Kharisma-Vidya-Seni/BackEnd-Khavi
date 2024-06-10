import dotenv from "dotenv";

const configureEnvSelf = () => {
  const result = dotenv.config();

  if (result.error) {
    throw result.error;
  }

  return result.parsed;
};

export default configureEnvSelf;
