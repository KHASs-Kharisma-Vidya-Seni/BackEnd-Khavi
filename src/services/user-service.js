import { supabase } from "../helper/supabaseClient.js";


export const fetchAllUsers = async () => {
  let { data: users, error } = await supabase.from("user").select("uid, username, email");
  return { users, error };
};

export const fetchUserById = async (id) => {
  let { data: user, error } = await supabase
    .from("user")
    .select("uid, username, email")
    .eq("uid", id)
    .single();
  return { user, error };
};

export const fetchAllForums = async () => {
  let { data: forums, error } = await supabase
    .from("forum")
    .select("id_user, id_forum, content, image, created_at");
  return { forums, error };
};
