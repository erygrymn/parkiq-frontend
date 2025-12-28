import React, { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { LoginScreen } from "../../screens/Auth/LoginScreen";
import { RegisterScreen } from "../../screens/Auth/RegisterScreen";
import { ForgotPasswordScreen } from "../../screens/Auth/ForgotPasswordScreen";
import { ResetPasswordScreen } from "../../screens/Auth/ResetPasswordScreen";
import { useAuthStore } from "../../state/authStore";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  const navigation = useNavigation();
  const resetFlag = useAuthStore((state) => state.shouldShowResetPassword);
  const setShouldShowResetPassword = useAuthStore((state) => state.setShouldShowResetPassword);
  const registerFlag = useAuthStore((state) => state.shouldShowRegister);
  const setShouldShowRegister = useAuthStore((state) => state.setShouldShowRegister);

  useEffect(() => {
    if (resetFlag) {
      (navigation as any).navigate("ResetPassword");
      setShouldShowResetPassword(false);
    }
  }, [resetFlag, navigation, setShouldShowResetPassword]);

  useEffect(() => {
    if (registerFlag) {
      const timer = setTimeout(() => {
        try {
          if ((navigation as any).navigate) {
            (navigation as any).navigate("Register");
          }
        } catch (error) {
          console.error("Navigation error:", error);
        } finally {
          setShouldShowRegister(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [registerFlag, navigation, setShouldShowRegister]);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="Login"
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
};
