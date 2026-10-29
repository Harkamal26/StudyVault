
export const getMyProfile = (req, res) => {
  return res.status(200).json({
    message: "Profile fetched successfully.",
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
};
