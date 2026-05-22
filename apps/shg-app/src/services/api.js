import axios from "axios";

const API = axios.create({
  baseURL: "https://immodest-duchess-tibia.ngrok-free.dev",
});

export default API;
