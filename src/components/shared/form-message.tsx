import { Alert, AlertDescription } from "@/components/ui/alert";
import { authErrorMessage } from "@/features/auth/messages";

type FormMessageProps = {
  errorCode?: string;
  message?: string;
};

export function FormMessage({ errorCode, message }: FormMessageProps) {
  if (!errorCode && !message) return null;

  return (
    <Alert variant={errorCode ? "destructive" : "default"}>
      <AlertDescription>
        {errorCode ? authErrorMessage(errorCode) : message}
      </AlertDescription>
    </Alert>
  );
}
