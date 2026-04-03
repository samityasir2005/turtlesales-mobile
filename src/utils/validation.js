import * as yup from "yup";

export const loginSchema = yup.object({
  email: yup.string().required("Email is required").email("Please enter a valid email"),
  password: yup.string().required("Password is required").min(8, "Password must be at least 8 characters"),
});

export const registerSchema = yup.object({
  name: yup.string().required("Name is required").min(2, "Min 2 characters").max(50, "Max 50 characters"),
  email: yup.string().required("Email is required").email("Please enter a valid email"),
  password: yup
    .string()
    .required("Password is required")
    .min(8, "Min 8 characters")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Must contain uppercase, lowercase, number and special character"
    ),
  confirmPassword: yup
    .string()
    .required("Please confirm your password")
    .oneOf([yup.ref("password")], "Passwords must match"),
});

export const saleSchema = yup.object({
  doorStatus: yup
    .string()
    .required("Door status is required")
    .oneOf(["no_answer", "not_interested", "callback", "sale_made", "do_not_knock"], "Invalid status"),
  name: yup.string().required("Name is required").min(2, "Min 2 characters").max(100, "Max 100 characters"),
  number: yup.string().when("doorStatus", {
    is: (val) => val === "sale_made" || val === "callback",
    then: (s) => s.required("Phone number is required").matches(/^\+?[\d\s\-()]+$/, "Invalid phone number"),
    otherwise: (s) => s.notRequired(),
  }),
  address: yup.string().required("Address is required").min(5, "Enter a complete address").max(300, "Max 300 chars"),
  price: yup.number().when("doorStatus", {
    is: "sale_made",
    then: (s) => s.required("Price is required").positive("Must be positive").max(999999.99, "Max $999,999.99"),
    otherwise: (s) => s.notRequired().nullable().transform((v, o) => (o === "" ? null : v)),
  }),
  details: yup.string().when("doorStatus", {
    is: "sale_made",
    then: (s) => s.required("Sale details required").max(500, "Max 500 chars"),
    otherwise: (s) => s.notRequired().max(500, "Max 500 chars"),
  }),
  callbackTime: yup.string().when("doorStatus", {
    is: "callback",
    then: (s) => s.required("Return time is required"),
    otherwise: (s) => s.notRequired(),
  }),
});

export const organizationSchema = yup.object({
  name: yup.string().required("Organization name is required").min(2).max(100),
  description: yup.string().max(500, "Max 500 characters"),
});

export const timeslotSchema = yup.object({
  date: yup.date().required("Date is required"),
  startTime: yup
    .string()
    .required("Start time is required")
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: yup
    .string()
    .required("End time is required")
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  maxEmployees: yup.number().required().min(1).max(10),
});
