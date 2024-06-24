// import { supabase } from "../helper/supabaseClient.js";
import pool from "../lib/db-neon.js";

export const fetchAllUsers = async () => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT uid, username, email FROM "users"');

    const users = result.rows;
    return { users, error: null };
  } catch (error) {
    return { users: null, error: error.message };
  } finally {
    client.release();
  }
};

export const fetchUserById = async id => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT uid, username, email, photo_url FROM "users" WHERE uid = $1',
      [id],
    );

    const user = result.rows[0];
    return { user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  } finally {
    client.release();
  }
};
export const fetchAllForums = async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM "forum"',
    );

    const forums = result.rows;
    return { forums, error: null };
  } catch (error) {
    return { forums: null, error: error.message };
  } finally {
    client.release();
  }
};
