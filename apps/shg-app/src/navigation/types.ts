export type OrdersStackParamList = {
  OrdersOverview: { filter?: string } | undefined;
  IncomingOrders: undefined;
  AcceptedOrders: { initialTab?: 'pickup' | 'delivery' } | undefined;
  RejectedOrders: undefined;
  Delivery: undefined;
  CompletedOrders: undefined;
  OrderDetails: { order: any };
  CompletedOrderDetails: { order: any };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Orders: { filter?: string } | undefined;
  Earning: undefined;
  OrderHistory: undefined;
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
  OrderHistoryDetails: { order: any };
};
