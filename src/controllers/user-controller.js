import asyncHandler from "express-async-handler";
import { fetchAllForums, fetchAllUsers, fetchUserById } from "../services/user-service.js";

export const getUsers = asyncHandler(async (req, res) => {
  try {
    const { users, error: UserError } = await fetchAllUsers();

    if (UserError) throw UserError;

    if (!users) return res.status(404).json({ message: "No users found" });

    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export const getUsersWithForums = asyncHandler(async (req, res) => {
  try {
    const { users, error: usersError } = await fetchAllUsers();
    const { forums, error: forumsError } = await fetchAllForums();

    if (usersError || forumsError) {
      console.error("Error fetching data:", usersError || forumsError);
      return res.status(500).json({ error: "Internal server error" });
    }

    // Merge users and their forums
    const usersWithForums = users.map((user) => {
      const userForums = forums.filter((forum) => forum.id_user === user.uid);
      return { ...user, forums: userForums };
    });

    res.json(usersWithForums);
  } catch (error) {
    console.error("Error fetching data:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

export const getUserById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const { user, error: UserError } = await fetchUserById(id);

    if (UserError) throw UserError;

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

