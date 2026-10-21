import { Alert as NativeAlert, Platform, type AlertButton } from 'react-native';

/** Use native alert sheets on phones and browser dialogs in web preview. */
export function showAppAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    NativeAlert.alert(title, message, buttons);
    return;
  }

  const prompt = [title, message].filter(Boolean).join('\n\n');
  if (!buttons?.length) {
    window.alert(prompt);
    return;
  }

  const actions = buttons.filter((button) => button.style !== 'cancel');
  const hasCancel = actions.length !== buttons.length;
  if (!actions.length) return;

  if (actions.length === 1) {
    if (!hasCancel || window.confirm(prompt)) void actions[0].onPress?.();
    return;
  }

  const choices = actions.map((button, index) => `${index + 1}. ${button.text}`).join('\n');
  const answer = window.prompt(`${prompt}\n\n${choices}\n\nEnter a number, or cancel to close.`, '1');
  if (answer === null) return;
  const selected = Number.parseInt(answer, 10) - 1;
  if (selected >= 0 && selected < actions.length) void actions[selected].onPress?.();
}

export const Alert = { alert: showAppAlert };
