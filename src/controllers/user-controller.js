import asyncHandler from "express-async-handler";
import { fetchAllForums, fetchAllUsers, fetchUserById } from "../services/user-service.js";
import { supabase, supabaseBucket } from "../helper/supabaseClient.js";


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
    const usersWithForums = users.map(user => {
      const userForums = forums.filter(forum => forum.id_user === user.uid);
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

export const updateUserProfile = asyncHandler(async (req, res) => {
  try {
    const { username } = req.body;
    const image = req.file;

    const { id } = req.params; // User ID from URL parameter
    const uid = req.user.uid; // Current user's UID from authentication

    // Ensure UID from req.user matches ID from req.params
    if (uid !== id) {
      return res.status(403).json({ error: "Unauthorized access. User ID does not match." });
    }

    // Validate user ID
    if (!uid) {
      return res.status(400).json({ error: "User ID is required to perform this action." });
    }

    // Fetch user data from Supabase
    const { data: user, error: userError } = await supabase
      .from("user")
      .select("uid, username, photoURL")
      .eq("uid", uid)
      .single();

    // Handle user fetch errors
    if (userError) {
      return res.status(404).json({ error: "User not found." });
    }

    // Check if the retrieved user is the logged-in user
    if (user.uid !== uid) {
      return res.status(403).json({ error: "Unauthorized." });
    }

    let imageUrl = user.photoURL; // Initialize imageUrl with current photoURL

    // Handle image upload (if an image is provided)
    if (image) {
      // Fetch old image data
      const { data: oldUserData, error: oldUserError } = await supabase
        .from("user")
        .select("photoURL")
        .eq("uid", uid)
        .single();

      // Handle errors fetching old image data
      if (oldUserError) {
        console.error("Error fetching old user data:", oldUserError);
        return res.status(500).json({ error: "Failed to fetch old user data." });
      }

      let oldImageUrl = null;

      // If there's an existing photoURL, delete the old image from Supabase Storage
      if (oldUserData && oldUserData.photoURL) {
        oldImageUrl = oldUserData.photoURL;
        const fileName = oldImageUrl.split("/").pop(); // Extract filename from URL

        // Remove old image from Supabase Storage
        const { data: deleteData, error: deleteError } = await supabaseBucket.remove(
          `profile/${fileName}`,
        );

        // Handle errors deleting old image
        if (deleteError) {
          console.error("Error deleting old image:", deleteError);
          return res.status(500).json({ error: "Failed to delete old image." });
        }
      }

      // Upload new image to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseBucket.upload(
        `profile/${image.originalname}`,
        image.buffer,
        {
          contentType: image.mimetype,
        },
      );

      // Handle errors uploading new image
      if (uploadError) {
        console.error("Error uploading new image:", uploadError);
        return res.status(500).json({ error: "Failed to upload new image." });
      }

      // Construct imageUrl with the newly uploaded image URL
      imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/images/profile/${image.originalname}`;
    }

    // Update user record in Supabase database
    const { data: updatedUser, error: updateError } = await supabase
      .from("user")
      .update({
        username,
        photoURL: imageUrl,
      })
      .eq("uid", uid)
      .single();

    // Handle errors updating user record
    if (updateError) {
      console.error("Error updating user record:", updateError);
      return res.status(500).json({ error: "Failed to update user record." });
    }

    // Respond with success message and updated user data
    res.status(200).json({ message: "User updated successfully.", user: updatedUser });
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error updating user:", error);

    // Respond with an appropriate error message
    res.status(500).json({ error: "Failed to update user. Please try again later." });
  }
});
