# Form Wizard Example

A complete multi-step form demonstrating advanced athreei SDK integration with complex state management and validation.

## What This Example Demonstrates

- **Multi-step form flow** with progress indicator
- **Complex state management** across multiple steps
- **Real-time validation** with inline error feedback
- **Multiple tool registration** for different form actions
- **Auto-trigger demo mode** that automatically fills the form
- **Professional UI** with smooth animations and responsive design

## Form Structure

### Step 1: Personal Information
- First Name (required, min 2 characters)
- Last Name (required, min 2 characters)
- Email (required, valid email format)
- Phone (optional, valid phone format)

### Step 2: Address Information
- Street Address (required, min 5 characters)
- City (required, min 2 characters)
- State (required, min 2 characters)
- ZIP Code (required, format: 12345 or 12345-6789)
- Country (optional, defaults to USA)

### Step 3: Payment Information
- Card Number (required, 16 digits)
- Expiry Date (required, MM/YY format)
- CVV (required, 3-4 digits)

## Registered Tools

### `get_form_state`
Returns the current state of the form including:
- Current step number
- All field values
- Validation errors
- Overall form validity

**Parameters**: None

**Returns**:
```javascript
{
  currentStep: number,
  totalSteps: number,
  fields: Record<string, string>,
  errors: Record<string, string>,
  isValid: boolean,
  stepValid: boolean
}
```

### `fill_field`
Fill a specific field with a value and validate it.

**Parameters**:
- `fieldName` (string, required): The field to fill (e.g., "firstName", "email")
- `value` (string, required): The value to set

**Returns**:
```javascript
{
  success: boolean,
  validation?: {
    valid: boolean,
    error?: string
  }
}
```

### `next_step`
Move to the next step after validating the current step.

**Parameters**: None

**Returns**:
```javascript
{
  success: boolean,
  currentStep?: number,
  errors?: Array<{ field: string, message: string }>
}
```

### `previous_step`
Move to the previous step.

**Parameters**: None

**Returns**:
```javascript
{
  success: boolean,
  currentStep?: number
}
```

### `submit_form`
Submit the completed form after validating all steps.

**Parameters**: None

**Returns**:
```javascript
{
  success: boolean,
  submissionId?: string,
  timestamp?: string,
  errors?: Array<{ field: string, message: string }>
}
```

### `validate_step`
Validate a specific step or the current step.

**Parameters**:
- `step` (number, optional): Step number to validate (1-3). Defaults to current step.

**Returns**:
```javascript
{
  valid: boolean,
  errors: Array<{ field: string, message: string }>
}
```

## Running This Example

```bash
# From the examples/form-wizard directory
cd examples/form-wizard

# Start a local server (choose one):

# Python 3
python3 -m http.server 8000

# Bun
bun --serve index.html

# Node.js http-server
http-server -p 8000

# Open http://localhost:8000 in your browser
```

## Demo Mode

The example starts in mock mode with auto-trigger enabled. The form will automatically:

1. Wait 2 seconds after page load
2. Fill all fields in Step 1
3. Advance to Step 2
4. Fill all fields in Step 2
5. Advance to Step 3
6. Fill all fields in Step 3
7. Submit the form

This demonstrates how an AI assistant would interact with the form.

## Testing with Real Extension

To test with the actual athreei extension:

1. Install the athreei Chrome extension
2. Comment out the `enableMockMode()` call in `script.js`
3. Reload the page
4. Connect your AI app to athreei
5. Ask the AI to help fill out the form

## Key Features

### State Management

The form maintains a centralized state object:
```javascript
const formState = {
  currentStep: 1,
  totalSteps: 3,
  fields: { /* all field values */ },
  errors: { /* validation errors */ },
  touched: { /* which fields have been touched */ }
}
```

### Validation

Each field has validation rules:
- Required/optional
- Minimum length
- Regular expression patterns
- Custom error messages

Validation runs:
- On blur (when leaving a field)
- On change (if field was already touched)
- Before step navigation
- Before form submission

### UI Feedback

- Green borders for valid fields
- Red borders for invalid fields
- Inline error messages
- Progress bar showing completion
- Step indicators (pending/active/completed)
- Smooth animations between steps

### Auto-formatting

Some fields automatically format input:
- **Card Number**: Adds spaces every 4 digits (1234 5678 9012 3456)
- **Expiry Date**: Automatically adds slash (MM/YY format)

## AI Interaction Examples

With the athreei extension installed, you can ask your AI:

> "Fill out this registration form with test data"

> "What information does this form need?"

> "Move to the next step"

> "Submit the form"

> "Check if the form is valid"

The AI will use the registered tools to interact with the form on your behalf.

## Code Highlights

### Tool Registration Pattern

```javascript
athreei.registerTool({
  name: 'fill_field',
  description: 'Fill a specific field in the form with a value',
  parameters: {
    fieldName: { type: 'string', required: true },
    value: { type: 'string', required: true }
  },
  handler: async ({ fieldName, value }) => {
    // Update state
    formState.fields[fieldName] = value;

    // Update UI
    const input = document.getElementById(fieldName);
    input.value = value;

    // Validate and return result
    const error = validateField(fieldName, value);
    return { success: true, validation: { valid: !error, error } };
  }
})
```

### Validation Logic

```javascript
function validateField(fieldName, value) {
  const rules = validationRules[fieldName];

  // Required check
  if (rules.required && !value?.trim()) {
    return rules.message;
  }

  // Pattern check
  if (rules.pattern && !rules.pattern.test(value)) {
    return rules.message;
  }

  return null;
}
```

### Step Navigation

```javascript
function nextStep() {
  const validation = validateStep();

  if (!validation.valid) {
    // Show errors
    validation.errors.forEach(({ field, message }) => {
      showFieldError(field, message);
    });
    return { success: false, errors: validation.errors };
  }

  // Move to next step
  formState.currentStep++;
  updateStepUI();
  return { success: true, currentStep: formState.currentStep };
}
```

## Learning Takeaways

This example teaches:

1. **Complex State Management**: How to maintain and sync state across multiple tools
2. **Validation Patterns**: Field-level and step-level validation strategies
3. **UI Synchronization**: Keeping the UI in sync with programmatic changes
4. **Error Handling**: Providing clear feedback when validation fails
5. **Multi-tool Coordination**: How multiple tools work together to accomplish a task

## Next Steps

- Try modifying the validation rules
- Add new fields to the form
- Implement additional tools (e.g., `reset_form`, `autofill_address`)
- Remove mock mode and test with real AI
- Study how the auto-trigger demo works

## Related Documentation

- [SDK Documentation](../../packages/sdk/README.md)
- [Website Integration Guide](../../docs/website-integration.md)
- [Basic Example](../basic/) - Start here if you're new
- [E-commerce Example](../ecommerce/) - See another complex example
