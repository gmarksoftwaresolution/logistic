export type OrdersStackParamList = {
  OrdersOverview: { filter?: string } | undefined;
  IncomingOrders: undefined;
  AcceptedOrders: undefined;
  RejectedOrders: undefined;
  Delivery: undefined;
  OrderHistory: undefined;
  OrderDetails: { order: any };
  CompletedOrderDetails: { order: any };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Orders: { filter?: string } | undefined;
  Earning: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Landing: undefined;
  Language: undefined;
  AuthSelection: undefined;
  Login: undefined;
  Signup: undefined;
  Help: undefined;
  Main: undefined;
  Stock: undefined;
  OrderHistory: undefined;
  Dashboard: undefined;
  Orders: { filter?: string } | undefined;
  OrdersOverview: undefined;
  IncomingOrders: undefined;
  RejectedOrders: undefined;
  Settings: undefined;
  Profile: undefined;
  PersonalDetails: undefined;
  Address: undefined;
  Terms: undefined;
  Privacy: undefined;
  ApplicationStatus: undefined;
  Delivery: undefined;
  CompletedOrderDetails: { order: any };
};
