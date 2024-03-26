// Tạo máy chủ
const port = 4000;
const express = require("express");
const app = express();
// Hỗ trợ, kết nối và tương tác với MongoDB
const mongoose = require("mongoose");
// Tạo thông báo JSON
const jwt = require("jsonwebtoken");
// Xử lý tập tin tải lên
const multer = require("multer");
const path = require("path");
// Xử lý CORS
const cors = require("cors");
// Hỗ trợ gửi mail
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

// Xử lý dữ liệu gửi đến từ yêu cầu HTTP
app.use(express.json());
// Hỗ trợ truy cập từ các nguồn khác nhau (Cross-Origin Resource Sharing)
app.use(cors());
const MongoClient = require("mongodb").MongoClient;
const router = express.Router();

const mongoURL =
  "mongodb+srv://kieutanquoc2002:Kieutanquoc3554@cluster0.c6rsr3z.mongodb.net/iClock";
const dbName = "iClock";
const collections = "Provice";

// Kết nối cơ sở dữ liệu với MongoDB
mongoose.connect(
  "mongodb+srv://kieutanquoc2002:Kieutanquoc3554@cluster0.c6rsr3z.mongodb.net/iClock"
);

// endpoint khởi tạo
app.get("/", (req, res) => {
  res.send("Express App dang chay");
});

// engine lưu trữ ảnh
const storage = multer.diskStorage({
  destination: "./Upload/Images",
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({ storage: storage });

// endpoint tải ảnh lên
app.use("/Images", express.static("Upload/Images"));
app.post("/Upload", upload.single("product"), (req, res) => {
  res.json({
    success: 1,
    image_url: `http://localhost:${port}/images/${req.file.filename}`,
  });
});

// schema sản phẩm
const Product = mongoose.model("Product", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  new_price: {
    type: String,
    required: true,
  },
  old_price: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  },
  description: {
    type: String,
    required: true,
  },
  straps: [
    {
      // Thêm trường cho thông tin về dây đồng hồ
      type: String,
      required: true,
    },
  ],
  face: [
    {
      // Thêm trường cho thông tin về mặt đồng hồ
      type: String,
      required: true,
    },
  ],
  pins: {
    type: String,
  },
  cases: {
    type: String,
  },
  brands: {
    type: String,
  },
  description_detail: {
    type: String,
  },
  quantity: {
    type: Number,
    required: true,
  },
});

module.exports = Product;

app.post("/addproduct", async (req, res) => {
  let products = await Product.find({});
  const selectedStrap = req.body.straps;
  const selectedFace = req.body.face;
  let id;
  if (products.length > 0) {
    let last_product_array = products.slice(-1);
    let last_product = last_product_array[0];
    id = last_product.id + 1;
  } else {
    id = 1;
  }
  const product = new Product({
    id: id,
    name: req.body.name,
    image: req.body.image,
    category: req.body.category,
    new_price: req.body.new_price,
    old_price: req.body.old_price,
    description: req.body.description,
    straps: selectedStrap, // Thêm thông tin về dây đồng hồ
    face: selectedFace,
    pins: `${req.body.pins} - ${req.body.power}`,
    cases: req.body.cases,
    brands: req.body.brands,
    description_detail: req.body.description_detail,
    quantity: req.body.quantity,
  });
  await product.save();
  console.log("Đã lưu!");
  res.json({
    success: true,
    name: req.body.name,
  });
});

// endpoint xoá sản phẩm
app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  console.log("Đã xoá sản phẩm");
  res.json({
    success: true,
    name: req.body.name,
  });
});

// endpoint hiển thị toàn bộ sản phẩm
app.get("/allproduct", async (req, res) => {
  let products = await Product.find({});
  console.log("Đã cập nhật tất cả sản phẩm");
  res.send(products);
});

// Schema người dùng
const Users = mongoose.model("Users", {
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  cartData: {
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  role: {
    type: String,
    required: true,
    default: "Khách hàng",
  },
  address: {
    type: String,
    default: "",
  },
  numberPhone: {
    type: String,
    default: "",
  },
});

// endpoint hiển thị toàn bộ người dùng
app.get("/users", async (req, res) => {
  let users = await Users.find({});
  console.log("Đã cập nhật tất cả người dùng");
  res.send(users);
});

const hashUserPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    throw new Error("Password hashing failed");
  }
};

const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

// endpoing đăng ký người dùng
app.post("/signup", async (req, res) => {
  let check = await Users.findOne({ email: req.body.email });
  if (check) {
    return res.status(400).json({ success: false, errors: "Đã tồn tại email" });
  }
  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i] = 0;
  }
  const hashedPassword = await hashUserPassword(req.body.password);
  const user = new Users({
    name: req.body.username,
    email: req.body.email,
    password: hashedPassword,
    cartData: cart,
  });

  await user.save();

  const data = {
    user: {
      id: user.id,
    },
  };

  const token = jwt.sign(data, "secret_ecom");
  res.json({ success: true, token });
});

// endpoint đăng nhập
app.post("/login", async (req, res) => {
  let user = await Users.findOne({ email: req.body.email });
  if (user) {
    const passCompare = await comparePassword(req.body.password, user.password);
    if (passCompare) {
      const data = {
        user: {
          id: user.id,
          role: user.role,
          email: user.email,
        },
      };
      const token = jwt.sign(data, "secret_ecom");
      res.json({ success: true, token, role: user.role, email: user.email });
    } else {
      res.json({ success: false, errors: "Sai mật khẩu" });
    }
  } else {
    res.json({ success: false, errors: "Email không hợp lệ" });
  }
});

app.listen(port, (error) => {
  if (!error) {
    console.log("Server dang chay tren cong: " + port);
  } else {
    console.log("Loi: " + error);
  }
});

// endpoint bộ sưu tập
app.get("/newcollection", async (req, res) => {
  let products = await Product.find({});
  let newcollect = products.slice(1).slice(-8);
  console.log("Đã cập nhật danh sách sưu tập");
  res.send(newcollect);
});

// endpoint phổ biến
app.get("/popularWoman", async (req, res) => {
  let products = await Product.find({ category: "Phái đẹp" });
  let popularWomen = products.slice(0, 4);
  console.log("Đã cập nhật danh sách phổ biến");
  res.send(popularWomen);
});

// xác thực người dùng dựa trên token JWT
const fetchUser = async (req, res, next) => {
  const token = req.header("auth-token");
  if (!token) {
    res.status(401).send({ errors: "Vui lòng xác thực mã hợp lệ" });
  } else {
    try {
      const data = jwt.verify(token, "secret_ecom");
      req.user = data.user;
      next();
    } catch (error) {
      res.status(401).send({ errors: "Vui lòng xác thực mã hợp lệ" });
    }
  }
};

app.get("/profile/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const token = req.headers.authorization.split(" ")[1];
    const decode = jwt.verify(token, "secret_ecom");
    console.log(token);
    if (decode.user.email != email) {
      return res
        .status(401)
        .json({ success: false, errors: "Token không hợp lệ" });
    }
    const user = await Users.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, errors: "Người dùng không tồn tại" });
    }
    console.log("Đã lấy thông tin người dùng");
    res.json({ success: true, user });
  } catch (error) {
    console.error(
      "Lỗi khi lấy thông tin người dùng đã đăng nhập:",
      error.message
    );
    res.status(500).json({
      success: false,
      errors: "Lỗi khi lấy thông tin người dùng đã đăng nhập",
    });
  }
});

app.put("/update-profile/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const user = await Users.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, errors: "Người dùng không tồn tại" });
    }

    user.name = req.body.name;
    user.email = req.body.email;
    user.address = req.body.address;
    user.numberPhone = req.body.numberPhone;
    await user.save();
    res.json({
      success: true,
      message: "Thông tin người dùng đã được cập nhật thành công",
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật thông tin người dùng:", error.message);
    res.status(500).json({
      success: false,
      errors: "Lỗi khi cập nhật thông tin người dùng",
    });
  }
});

// endpoint thêm sản phẩm vào giỏ hàng
app.post("/addToCart", fetchUser, async (req, res) => {
  console.log("Đã thêm", req.body.itemId);
  let userData = await Users.findOne({ _id: req.user.id });
  userData.cartData[req.body.itemId] += 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Đã thêm");
});

// endpoint xoá sản phẩm khỏi giỏ hàng
app.post("/removefromcart", fetchUser, async (req, res) => {
  console.log("Đã xoá", req.body.itemId);
  let userData = await Users.findOne({ _id: req.user.id });
  if (userData.cartData[req.body.itemId] > 0) {
    userData.cartData[req.body.itemId] -= 1;
  }
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Đã xoá khỏi giỏ hàng");
});

// endpoint nhận dữ liệu giỏ hàng
app.post(
  "/getcart",
  fetchUser,
  async (req, res) => {
    console.log("Đã cập nhật giỏ hàng");
    let userData = await Users.findOne({ _id: req.user.id });
    res.json(userData.cartData);
  },
  []
);

// API xem thông tin người dùng
app.get("/showUser/:_id", async (req, res) => {
  try {
    const user = await Users.findById(req.params._id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, errors: "Người dùng không tồn tại" });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, errors: "Lỗi server" });
  }
});

// Xoá người dùng
app.delete("/deleteUser/:_id", async (req, res) => {
  try {
    const deletedUser = await Users.findByIdAndDelete(req.params._id);
    if (!deletedUser) {
      return res
        .status(404)
        .json({ success: false, errors: "Không thể xoá thông tin người dùng" });
    }
    res.json({ success: true, message: "Người dùng đã được xoá" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, errors: "Lỗi server" });
  }
});

// API xem thông tin người dùng
app.get("/user/:_id", async (req, res) => {
  try {
    const user = await Users.findById(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, errors: "Người dùng không tồn tại" });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, errors: "Lỗi server" });
  }
});

// API đổi mật khẩu
app.put("/changepassword/:_id", async (req, res) => {
  try {
    const { _id } = req.params;
    const { oldPassword, newPassword } = req.body;
    // const userId = new ObjectID(_id);

    // Truy van nguoi dung tren co so du lieu
    const user = await Users.findById(_id);

    // Kiem tra mat khau cu co trung khop khong
    if (user.password !== oldPassword) {
      return res
        .status(400)
        .json({ success: false, errors: "Mật khẩu cũ không đúng" });
    }

    // Cap nhat mat khau
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: "Mật khẩu đã được cập nhật" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, errors: "Lỗi server" });
  }
});

const OTPs = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600,
  },
});

const OTP = mongoose.model("OTP", OTPs);
module.exports = OTP;

const createOTP = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

// Tạo endpoint để gửi email xác nhận đổi mật khẩu
app.post("/forgotpassword", async (req, res) => {
  const { email } = req.body;
  try {
    // Tao ma token dua tren email
    const otp = createOTP();
    let existingEmail = await OTP.findOne({ email });
    if (!existingEmail) {
      // Tạo một bản ghi mới trong cơ sở dữ liệu để lưu trữ mã OTP
      existingEmail = new OTP({ email, otp });
    } else {
      existingEmail.otp = otp;
      existingEmail.createdAt = new Date();
    }
    await existingEmail.save();
    res.status(200).json({
      success: true,
      message: "Mã OTP đã được tạo và gửi đến email của bạn.",
    });
    // Tao noi dung mail
    const mailOptions = {
      from: "kieutanquoc123@outlook.com",
      to: email,
      subject: "Xác nhận đổi mật khẩu",
      html: `<p>Chào bạn,</p>
            <p>Chúng tôi vừa nhận được yêu cầu đổi mật khẩu từ bạn.</p>
             <p>Bạn đã yêu cầu đổi mật khẩu. Mã OTP của bạn là: <span style="display: block; text-align: center; color: #0070f3; font-size: 65px; font-weight: bold;">${otp}</span>. Hãy nhập vào website và cung cấp mật khẩu mới. Đừng chia sẻ cho bất kỳ ai</p>`,
    };

    let transporter = nodemailer.createTransport({
      service: "outlook",
      auth: {
        user: "kieutanquoc123@outlook.com",
        pass: "Kieutanquoc-2904",
      },
    });

    // Gui email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        res
          .status(500)
          .json({ success: false, errors: "Có lỗi xảy ra khi gửi email" });
      } else {
        console.log("Email sent: " + info.response);
        res
          .status(200)
          .json({ success: true, message: "Email xác nhận đã được gửi" });
      }
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Có lỗi xảy ra khi tạo mã OTP." });
  }
});

app.post("/resetpassword", async (req, res) => {
  const { otp, newPassword, email } = req.body;

  try {
    // Kiểm tra OTP trong cơ sở dữ liệu
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res
        .status(401)
        .json({ success: false, errors: "Mã OTP không hợp lệ" });
    }

    // Tiến hành đổi mật khẩu cho người dùng với email tương ứng
    let user = await Users.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, errors: "Không thể tìm thấy người dùng" });
    }

    // Cập nhật mật khẩu
    user.password = newPassword;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Mật khẩu đã được thay đổi" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, errors: "Lỗi server" });
  }
});

// Endpoint to delete OTP record
app.post("/deleteotp", async (req, res) => {
  const { email } = req.body;
  try {
    await OTP.findOneAndDelete({ email });
    res.status(200).json({ success: true, message: "OTP đã được xoá" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, errors: "Lỗi server" });
  }
});

const WatchStrap = mongoose.model("WatchStrap", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
});
const WatchFace = mongoose.model("WatchFace", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
});
module.exports = { WatchStrap, WatchFace };

app.get("/allstraps", async (req, res) => {
  try {
    const all = await WatchStrap.find({});
    res.send(all);
  } catch (error) {}
});

app.post("/addstraps", async (req, res) => {
  try {
    const { name } = req.body;
    const straps = await WatchStrap.find({});
    let id;
    if (straps.length > 0) {
      let last_strap_array = straps.slice(-1);
      let last_strap = last_strap_array[0];
      id = last_strap.id + 1;
    } else {
      id = 1;
    }
    const watchStrap = new WatchStrap({
      id: id,
      name: name,
    });
    await watchStrap.save();
    res.status(201).json({ message: "Đã thêm dây đồng hồ thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/allfaces", async (req, res) => {
  try {
    const all = await WatchFace.find({});
    res.send(all);
  } catch (error) {}
});

app.post("/addfaces", async (req, res) => {
  try {
    const { name } = req.body;
    const faces = await WatchFace.find({});
    let id;
    if (faces.length > 0) {
      let last_face_array = faces.slice(-1);
      let last_face = last_face_array[0];
      id = last_face.id + 1;
    } else {
      id = 1;
    }
    const watchFace = new WatchFace({
      id: id,
      name: name,
    });
    await watchFace.save();
    res.status(201).json({ message: "Đã thêm mặt đồng hồ thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PIN = mongoose.model("PIN", {
  id: {
    type: Number,
    required: true,
  },
  power: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
});

module.exports = PIN;

app.get("/allpin", async (req, res) => {
  try {
    let pins = await PIN.find({});
    res.send(pins);
  } catch (error) {}
});

app.post("/addpin", async (req, res) => {
  try {
    const { power, name } = req.body;
    const pins = await PIN.find({});
    let id;
    if (pins.length > 0) {
      let last_pin_array = pins.slice(-1);
      let last_pin = last_pin_array[0];
      id = last_pin.id + 1;
    } else {
      id = 1;
    }
    const PINs = new PIN({
      id: id,
      power: power,
      name: name,
    });
    await PINs.save();
    res.status(201).json({ message: "Đã thêm thông tin PIN thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const WatchCase = mongoose.model("WatchCase", {
  id: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
});

module.exports = WatchCase;

app.get("/allwatchcase", async (req, res) => {
  try {
    let watchCases = await WatchCase.find({});
    res.send(watchCases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/addwatchcase", async (req, res) => {
  try {
    const { type } = req.body;
    const watchCases = await WatchCase.find({});
    let id;
    if (watchCases.length > 0) {
      let lastWatchCaseArray = watchCases.slice(-1);
      let lastWatchCase = lastWatchCaseArray[0];
      id = lastWatchCase.id + 1;
    } else {
      id = 1;
    }
    const newWatchCase = new WatchCase({
      id: id,
      type: type,
    });
    await newWatchCase.save();
    res
      .status(201)
      .json({ message: "Đã thêm thông tin vỏ đồng hồ thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const Promotion = mongoose.model("Promotion", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    default: Date.now,
  },
  discount: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    required: true,
    default: "Đang sử dụng",
  },
});

module.exports = Promotion;

// app.get("/generatePromote", (req, res) => {
//   const randomCode = crypto.randomBytes(4).toString("hex").toLocaleUpperCase();
//   res.send(randomCode);
// });

app.get("/allpromotions", async (req, res) => {
  try {
    let promotions = await Promotion.find({});
    res.send(promotions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/addpromotion", async (req, res) => {
  try {
    const { name, startDate, endDate, discount } = req.body;
    const randomCode = crypto.randomBytes(4).toString("hex").toUpperCase();
    const existingCode = await Promotion.findOne({ code: randomCode });
    if (existingCode) {
      res.status(500).json({ error: "Mã khuyến mãi đã tồn tại" });
    }
    const promotions = await Promotion.find({});
    let id;
    if (promotions.length > 0) {
      let lastPromotionArray = promotions.slice(-1);
      let lastPromotion = lastPromotionArray[0];
      id = lastPromotion.id + 1;
    } else {
      id = 1;
    }
    const newPromotion = new Promotion({
      id: id,
      name: name,
      startDate: startDate,
      endDate: endDate,
      discount: discount,
      code: randomCode,
    });
    await newPromotion.save();
    res
      .status(201)
      .json({ message: "Đã thêm thông tin khuyến mãi thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/removepromote", async (req, res) => {
  await Promotion.findOneAndDelete({ _id: req.body._id });
  console.log("Đã xoá mã khuyến mãi");
  res.json({ success: true, name: req.body.name });
});

app.post("/checkpromocode", async (req, res) => {
  const { promoCode } = req.body;
  try {
    const validPromoCode = await Promotion.findOne({ code: promoCode });
    if (validPromoCode) {
      res.status(200).json({
        success: true,
        message: "Mã giảm giá hợp lệ",
        discount: validPromoCode.discount,
        startDate: validPromoCode.startDate,
        endDate: validPromoCode.endDate,
        currentDate: new Date(),
      });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Mã giảm giá không hợp lệ" });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Mã giảm giá không hợp lệ" });
  }
});

const Brand = mongoose.model("Brand", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
});

module.exports = Brand;

app.get("/allbrands", async (req, res) => {
  try {
    let brands = await Brand.find({});
    res.send(brands);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/addbrand", async (req, res) => {
  try {
    const { name } = req.body;
    const brands = await Brand.find({});
    let id;
    if (brands.length > 0) {
      let lastBrandArray = brands.slice(-1);
      let lastBrand = lastBrandArray[0];
      id = lastBrand.id + 1;
    } else {
      id = 1;
    }
    const newBrand = new Brand({
      id: id,
      name: name,
    });
    await newBrand.save();
    res
      .status(201)
      .json({ message: "Đã thêm thông tin thương hiệu thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const roleUser = mongoose.model("Role", {
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
});

module.exports = roleUser;

app.get("/showRole", async (req, res) => {
  try {
    let roles = await roleUser.find({});
    res.send(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/addroles", async (req, res) => {
  try {
    const { name } = req.body;
    const roles = await roleUser.find({});
    let id;
    if (roles.length > 0) {
      let lastRoleArray = roles.slice(-1);
      let lastRole = lastRoleArray[0];
      id = lastRole.id + 1;
    } else {
      id = 1;
    }
    const newRole = new roleUser({
      id: id,
      name: name,
    });
    await newRole.save();
    res.status(201).json({ message: "Đã thêm vai trò người dùng thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/changeUserRole/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const { role } = req.body;
    await Users.findByIdAndUpdate({ _id: userId }, { $set: { role: role } });
    res
      .status(200)
      .json({ message: "Đã cập nhật vai trò của người dùng thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/provinces", async (req, res) => {
  try {
    const client = await MongoClient.connect(mongoURL);
    const db = client.db(dbName);
    const collection = db.collection(collections);
    const data = await collection.distinct("name");
    res.json(data);
    client.close();
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/districts/:provinceName", async (req, res) => {
  const provinceName = req.params.provinceName;
  try {
    const client = await MongoClient.connect(mongoURL);
    const db = client.db(dbName);
    const collection = db.collection(collections);
    const province = await collection.findOne({ name: provinceName });
    const districts = province
      ? province.districts.map((district) => district.name)
      : [];
    res.json(districts);
    client.close();
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/wards/:provinceName/:districtsName", async (req, res) => {
  const { provinceName, districtsName } = req.params;
  try {
    const client = await MongoClient.connect(mongoURL);
    const db = client.db(dbName);
    const collection = db.collection(collections);
    const province = await collection.findOne({ name: provinceName });
    const district = province
      ? province.districts.find((district) => district.name === districtsName)
      : null;
    const ward = district ? district.wards.map((ward) => ward.name) : [];
    res.json(ward);
    client.close();
  } catch (error) {
    console.error("Error retrieving data:", error);
    res.status(500).send("Internal Server Error");
  }
});

const ReviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },

  customerName: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
  },

  timestamps: {
    type: Date,
    default: Date.now,
  },

  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },

  reviewContent: {
    type: String,
    required: true,
  },
});

const Review = mongoose.model("Review", ReviewSchema);
module.exports = Review;

app.post("/addReview/:productId", fetchUser, async (req, res) => {
  try {
    const { customerName, email, rating, reviewContent } = req.body;
    const productId = req.params.productId;
    const product = await Product.findOne({ _id: productId });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Sản phẩm không tồn tại!" });
    }
    const review = new Review({
      productId,
      customerName,
      email,
      rating,
      reviewContent,
    });
    await review.save();
    res.status(201).json({ success: true, message: "Đánh giá đã được thêm!" });
  } catch (error) {}
});

app.delete("/deletereview/:reviewId", fetchUser, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findById(reviewId);
    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Đánh giá không tồn tại" });
    }
    if (req.user.email != review.email) {
      return res
        .status(403)
        .json({ success: false, message: "Không có quyền xoá bình luận" });
    }
    await review.deleteOne();
    res.json({ success: true, message: "Đánh giá đã được xoá!" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, errors: "Lỗi server" });
  }
});

app.get("/productReviews/:productId", async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId });
    res.json({ success: true, reviews });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, errors: "Lỗi server" });
  }
});

const orderSchema = new mongoose.Schema({
  recipientInfo: {
    name: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    mail: {
      type: String,
      required: true,
    },
  },
  orderDetails: [
    {
      idProduct: {
        type: String,
        required: true,
      },
      productName: {
        type: String,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: String,
        required: true,
      },
      strapType: {
        type: String,
        required: true,
      },
      faceType: {
        type: String,
        required: true,
      },
      image: {
        type: String,
        required: true,
      },
    },
  ],
  totalBfPromote: {
    type: String,
    required: true,
  },
  totalAmount: {
    type: String,
    required: true,
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  discountApplied: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    default: "Đang xử lý",
  },
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;

app.post("/addorder", async (req, res) => {
  try {
    const {
      recipientInfo,
      orderDetails,
      totalAmount,
      paymentMethod,
      discountApplied,
      totalBfPromote,
    } = req.body;

    const newOrder = new Order({
      recipientInfo,
      orderDetails,
      totalAmount,
      paymentMethod,
      discountApplied,
      totalBfPromote,
    });

    await newOrder.save();

    res.json({
      success: true,
      message: "Đã thêm đơn hàng thành công",
    });
  } catch (error) {
    console.error("Lỗi khi thêm đơn hàng:", error.message);
    res.status(500).json({
      success: false,
      errors: "Lỗi khi thêm đơn hàng",
    });
  }
});

app.get("/allorders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đơn hàng:", error.message);
    res.status(500).json({
      success: false,
      errors: "Lỗi khi lấy danh sách đơn hàng",
    });
  }
});

app.get("/orderdetail/:orderId", async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, errors: "Không tìm thấy đơn hàng" });
    }
    res.json(order);
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết đơn hàng:", error.message);
    res
      .status(500)
      .json({ success: false, errors: "Lỗi khi lấy chi tiết đơn hàng" });
  }
});

const statusOrder = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
});

const Status = new mongoose.model("Status", statusOrder);
module.exports = Status;

app.get("/allstatus", async (req, res) => {
  try {
    const statuses = await Status.find({});
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ success: false, message: "Đã có lỗi xảy ra" });
  }
});

app.post("/addstatus", async (req, res) => {
  try {
    const { status } = req.body;
    const newStatus = new Status({
      name: status,
    });
    await newStatus.save();
    res
      .status(200)
      .json({ success: true, message: "Đã thêm trạng thái đơn hàng mới" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Có lỗi xảy ra!" });
  }
});

app.post("/updatestatusorder/:orderId", async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { status } = req.body;

    const updatedOrder = await Order.findByIdAndUpdate(orderId, {
      status: status,
    });

    if (!updatedOrder) {
      res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn hàng" });
    }
    res.json({ success: true, message: "Đã cập nhật trạng thái đơn hàng" });
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái đơn hàng:", error.message);
    res
      .status(500)
      .json({ success: false, errors: "Lỗi khi cập nhật trạng thái đơn hàng" });
  }
});

app.get("/userorders/:userEmail", async (req, res) => {
  try {
    const userEmail = req.params.userEmail;
    const userOrders = await Order.find({
      "recipientInfo.mail": userEmail,
    }).sort({ createdAt: -1 });
    if (userOrders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng cho người dùng này",
      });
    }
    res.json(userOrders);
  } catch (error) {
    console.error(
      "Lỗi khi lấy danh sách đơn hàng của người dùng:",
      error.message
    );
    res.status(500).json({
      success: false,
      errors: "Lỗi khi lấy danh sách đơn hàng của người dùng",
    });
  }
});

app.delete("/deleteorder/:orderId", async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const deletedOrder = await Order.findByIdAndDelete(orderId);

    if (!deletedOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn hàng" });
    }
    return res.json({ success: true, message: "Đã xóa đơn hàng" });
  } catch (error) {
    console.error("Lỗi khi xóa đơn hàng:", error.message);
    return res
      .status(500)
      .json({ success: false, errors: "Lỗi khi xóa đơn hàng" });
  }
});

app.post("/updateQuantity/:productId", async (req, res) => {
  try {
    const productId = req.params.productId;
    const { quantity } = req.body;
    const products = await Product.findById(productId);
    if (!products) {
      res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm" });
    }
    products.quantity = quantity;
    const updatedProduct = await products.save();
    res.status(200).json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error("Lỗi khi cập nhật số lượng:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi cập nhật số lượng" });
  }
});

app.get("/allordersx", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    const productQuantities = {};

    orders.forEach((order) => {
      const orderDate = order.createdAt.toDateString();

      order.orderDetails.forEach((item) => {
        const productName = item.productName;
        const strapType = item.strapType;
        const faceType = item.faceType;
        const quantity = item.quantity;
        const status = order.status;

        // Kiểm tra nếu trạng thái là "chờ xác nhận", "đang xử lý" hoặc "đã hủy", bỏ qua mục này
        if (
          status === "Chờ xác nhận" ||
          status === "Đang xử lý" ||
          status === "Đã hủy"
        ) {
          return;
        }

        const key = `${productName}-${faceType}-${strapType}`;

        if (productQuantities[key]) {
          productQuantities[key].quantity += quantity;
        } else {
          productQuantities[key] = {
            orderDate: orderDate,
            productName: productName,
            faceType: faceType,
            strapType: strapType,
            quantity: quantity,
          };
        }
      });
    });

    const aggregatedProducts = Object.values(productQuantities);

    res.json(aggregatedProducts);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đơn hàng:", error.message);
    res.status(500).json({
      success: false,
      errors: "Lỗi khi lấy danh sách đơn hàng",
    });
  }
});

app.get("/orderbydate/:date", async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const startOfDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
      0
    ); // Bắt đầu của ngày được chỉ định
    const endOfDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999
    ); // Kết thúc của ngày được chỉ định
    const orders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: "Đã giao hàng", // Thêm điều kiện lọc theo trạng thái "Đã giao hàng"
    });
    if (!orders || orders.length === 0) {
      // Kiểm tra nếu không có đơn hàng nào được tìm thấy
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn hàng nào!" });
    }
    res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
});
