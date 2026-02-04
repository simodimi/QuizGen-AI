import axios from "axios";
const connect = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
});
export default connect;
