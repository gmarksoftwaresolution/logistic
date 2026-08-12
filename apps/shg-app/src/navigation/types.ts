
export type OrdersStackParamList = {
  OrderManagement: { filter?: string } | undefined;
  IncomingOrders: undefined;
  AcceptedOrders: { initialTab?: 'pickup' | 'drop' | 'delivery' } | undefined;
  ReturnedOrders: undefined;
  Drop: undefined;
  CompletedOrders: undefined;
  RedirectedOrders: undefined;
  OrderDetails: { order: any };
  CompletedOrderDetails: { order: any };
  VehicleSuggestionDetails: { order: any };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Orders: { filter?: string } | undefined;
  Earnings: undefined;
  OrderHistory: undefined;
  Inventory: undefined;
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
  OrderManagement: undefined;
  IncomingOrders: undefined;
  Settings: undefined;
  Profile: undefined;
  PersonalDetails: undefined;
  Address: undefined;
  Terms: undefined;
  Privacy: undefined;
  ApplicationStatus: undefined;
  Drop: undefined;
  OrderDetails: { order: any };
  CompletedOrderDetails: { order: any };
  OrderHistoryDetails: { order: any };
  PickupScanner: { sessionId?: string; orderIds?: string[] } | undefined;
};
