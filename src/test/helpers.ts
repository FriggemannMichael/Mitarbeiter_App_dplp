import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Füllt das Onboarding-Formular aus und navigiert zur Timesheet-Seite
 * @param user - UserEvent Setup-Instanz
 * @param firstName - Vorname (Standard: 'Test')
 * @param lastName - Nachname (Standard: 'User')
 */
export async function completeOnboarding(
  user: ReturnType<typeof userEvent.setup>,
  firstName = "Test",
  lastName = "User"
) {
  // Vorname eingeben
  const firstNameInput = screen.getByPlaceholderText(/vorname|first.*name/i);
  await user.clear(firstNameInput);
  await user.type(firstNameInput, firstName);

  // Nachname eingeben
  const lastNameInput = screen.getByPlaceholderText(
    /nachname|mustermann|last.*name/i
  );
  await user.clear(lastNameInput);
  await user.type(lastNameInput, lastName);

  // GDPR-Checkbox aktivieren
  const gdprCheckbox = screen.getByRole("checkbox");
  if (!gdprCheckbox.querySelector("input")?.checked) {
    await user.click(gdprCheckbox);
  }

  // Zur Timesheet-Seite navigieren
  const continueButton = screen.getByRole("button", {
    name: /weiter|continue/i,
  });
  await user.click(continueButton);

  // Warten bis Timesheet geladen ist
  await waitFor(
    () => {
      expect(
        screen.getByText(/kalenderwoche|calendar.*week|kw\s*\d+/i)
      ).toBeInTheDocument();
    },
    { timeout: 5000 }
  );
}

// Removed: completeOnboardingWithFullName - unused legacy helper
