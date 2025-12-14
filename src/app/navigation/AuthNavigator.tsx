import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginScreen } from "../../screens/Auth/LoginScreen";
import { RegisterScreen } from "../../screens/Auth/RegisterScreen";
import { ForgotPasswordScreen } from "../../screens/Auth/ForgotPasswordScreen";

const Stack = createNativeStackNavigator();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Login"
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};

