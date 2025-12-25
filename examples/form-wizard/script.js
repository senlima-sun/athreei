/**
 * Form Wizard Example - athreei SDK Integration
 *
 * This example demonstrates:
 * - Multi-step form with validation
 * - Complex tool registration with state management
 * - Field-level validation feedback
 * - Mock mode for testing without extension
 */

// Get the athreei SDK (loaded from script tag)
const { athreei, enableMockMode } = window.athreeiSdk;

// Form state management
const formState = {
  currentStep: 1,
  totalSteps: 3,
  fields: {
    // Step 1: Personal Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    // Step 2: Address
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    // Step 3: Payment
    cardNumber: '',
    expiry: '',
    cvv: ''
  },
  errors: {},
  touched: {},
  isValid: false
};

// Validation rules
const validationRules = {
  firstName: {
    required: true,
    minLength: 2,
    message: 'First name is required (min 2 characters)'
  },
  lastName: {
    required: true,
    minLength: 2,
    message: 'Last name is required (min 2 characters)'
  },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Valid email address is required'
  },
  phone: {
    required: false,
    pattern: /^[\d\s\-\+\(\)]+$/,
    message: 'Invalid phone number format'
  },
  street: {
    required: true,
    minLength: 5,
    message: 'Street address is required (min 5 characters)'
  },
  city: {
    required: true,
    minLength: 2,
    message: 'City is required (min 2 characters)'
  },
  state: {
    required: true,
    minLength: 2,
    message: 'State is required (2+ characters)'
  },
  zipCode: {
    required: true,
    pattern: /^\d{5}(-\d{4})?$/,
    message: 'Valid ZIP code is required (e.g., 12345 or 12345-6789)'
  },
  country: {
    required: false
  },
  cardNumber: {
    required: true,
    pattern: /^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/,
    message: 'Valid 16-digit card number is required'
  },
  expiry: {
    required: true,
    pattern: /^(0[1-9]|1[0-2])\/\d{2}$/,
    message: 'Valid expiry date is required (MM/YY)'
  },
  cvv: {
    required: true,
    pattern: /^\d{3,4}$/,
    message: 'Valid CVV is required (3-4 digits)'
  }
};

// Fields by step
const stepFields = {
  1: ['firstName', 'lastName', 'email', 'phone'],
  2: ['street', 'city', 'state', 'zipCode', 'country'],
  3: ['cardNumber', 'expiry', 'cvv']
};

/**
 * Validate a single field
 */
function validateField(fieldName, value) {
  const rules = validationRules[fieldName];
  if (!rules) return null;

  // Required check
  if (rules.required && (!value || value.trim() === '')) {
    return rules.message || `${fieldName} is required`;
  }

  // Skip other validations if field is empty and not required
  if (!value || value.trim() === '') {
    return null;
  }

  // Min length check
  if (rules.minLength && value.length < rules.minLength) {
    return rules.message || `Minimum ${rules.minLength} characters required`;
  }

  // Pattern check
  if (rules.pattern && !rules.pattern.test(value)) {
    return rules.message || `Invalid format`;
  }

  return null;
}

/**
 * Validate all fields in a step
 */
function validateStep(step = formState.currentStep) {
  const fields = stepFields[step];
  const errors = [];

  fields.forEach(fieldName => {
    const value = formState.fields[fieldName];
    const error = validateField(fieldName, value);

    if (error) {
      errors.push({ field: fieldName, message: error });
      formState.errors[fieldName] = error;
    } else {
      delete formState.errors[fieldName];
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Show validation error for a field
 */
function showFieldError(fieldName, message) {
  const input = document.getElementById(fieldName);
  const errorDiv = document.getElementById(`${fieldName}-error`);

  if (input && errorDiv) {
    input.classList.add('error');
    input.classList.remove('success');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
  }
}

/**
 * Clear validation error for a field
 */
function clearFieldError(fieldName) {
  const input = document.getElementById(fieldName);
  const errorDiv = document.getElementById(`${fieldName}-error`);

  if (input && errorDiv) {
    input.classList.remove('error');
    input.classList.add('success');
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
  }
}

/**
 * Update UI to show current step
 */
function updateStepUI() {
  // Update step indicators
  document.querySelectorAll('.step').forEach((step, index) => {
    const stepNum = index + 1;
    step.classList.remove('active', 'completed');

    if (stepNum < formState.currentStep) {
      step.classList.add('completed');
    } else if (stepNum === formState.currentStep) {
      step.classList.add('active');
    }
  });

  // Update progress line
  const progress = ((formState.currentStep - 1) / (formState.totalSteps - 1)) * 100;
  document.getElementById('progressLine').style.width = `${progress}%`;

  // Update form steps
  document.querySelectorAll('.form-step').forEach((step, index) => {
    step.classList.remove('active');
    if (index + 1 === formState.currentStep) {
      step.classList.add('active');
    }
  });
}

/**
 * Move to next step
 */
function nextStep() {
  // Validate current step
  const validation = validateStep();

  if (!validation.valid) {
    // Show all errors
    validation.errors.forEach(({ field, message }) => {
      showFieldError(field, message);
    });
    return { success: false, errors: validation.errors };
  }

  // Clear errors and move to next step
  stepFields[formState.currentStep].forEach(clearFieldError);

  if (formState.currentStep < formState.totalSteps) {
    formState.currentStep++;
    updateStepUI();
    return { success: true, currentStep: formState.currentStep };
  }

  return { success: false, errors: [{ message: 'Already on last step' }] };
}

/**
 * Move to previous step
 */
function previousStep() {
  if (formState.currentStep > 1) {
    formState.currentStep--;
    updateStepUI();
    return { success: true, currentStep: formState.currentStep };
  }

  return { success: false, errors: [{ message: 'Already on first step' }] };
}

/**
 * Submit the form
 */
function submitForm() {
  // Validate all steps
  let allValid = true;
  const allErrors = [];

  for (let step = 1; step <= formState.totalSteps; step++) {
    const validation = validateStep(step);
    if (!validation.valid) {
      allValid = false;
      allErrors.push(...validation.errors);
    }
  }

  if (!allValid) {
    // Go to first step with errors
    for (let step = 1; step <= formState.totalSteps; step++) {
      const validation = validateStep(step);
      if (!validation.valid) {
        formState.currentStep = step;
        updateStepUI();
        validation.errors.forEach(({ field, message }) => {
          showFieldError(field, message);
        });
        break;
      }
    }

    return {
      success: false,
      errors: allErrors
    };
  }

  // Generate submission ID
  const submissionId = 'SUB-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();

  // Show success status
  const formContent = document.getElementById('formContent');
  const successStatus = document.getElementById('successStatus');
  const submissionDetails = document.getElementById('submissionDetails');

  formContent.style.display = 'none';
  successStatus.classList.add('show');

  // Display submission details
  submissionDetails.innerHTML = `
    <h3>Submission Details</h3>
    <p><strong>Submission ID:</strong> ${submissionId}</p>
    <p><strong>Name:</strong> ${formState.fields.firstName} ${formState.fields.lastName}</p>
    <p><strong>Email:</strong> ${formState.fields.email}</p>
    <p><strong>Address:</strong> ${formState.fields.street}, ${formState.fields.city}, ${formState.fields.state} ${formState.fields.zipCode}</p>
    <p><strong>Payment:</strong> Card ending in ${formState.fields.cardNumber.slice(-4)}</p>
  `;

  return {
    success: true,
    submissionId,
    timestamp: new Date().toISOString()
  };
}

/**
 * Initialize the form
 */
function initForm() {
  // Bind input changes to state
  Object.keys(formState.fields).forEach(fieldName => {
    const input = document.getElementById(fieldName);
    if (input) {
      // Set initial value
      input.value = formState.fields[fieldName];

      // Listen for changes
      input.addEventListener('input', (e) => {
        formState.fields[fieldName] = e.target.value;
        formState.touched[fieldName] = true;

        // Validate on change if already touched
        if (formState.touched[fieldName]) {
          const error = validateField(fieldName, e.target.value);
          if (error) {
            showFieldError(fieldName, error);
          } else {
            clearFieldError(fieldName);
          }
        }
      });

      // Validate on blur
      input.addEventListener('blur', (e) => {
        formState.touched[fieldName] = true;
        const error = validateField(fieldName, e.target.value);
        if (error) {
          showFieldError(fieldName, error);
        } else {
          clearFieldError(fieldName);
        }
      });
    }
  });

  // Format card number as user types
  const cardInput = document.getElementById('cardNumber');
  if (cardInput) {
    cardInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\s/g, '');
      let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
      e.target.value = formattedValue;
      formState.fields.cardNumber = formattedValue;
    });
  }

  // Format expiry date
  const expiryInput = document.getElementById('expiry');
  if (expiryInput) {
    expiryInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4);
      }
      e.target.value = value;
      formState.fields.expiry = value;
    });
  }

  updateStepUI();
}

// Expose functions to window for button onclick handlers
window.formWizard = {
  nextStep,
  previousStep,
  submitForm
};

// ============================================================================
// athreei SDK Integration
// ============================================================================

console.log('[Form Wizard] Initializing athreei SDK integration...');

// Enable mock mode with auto-trigger for demo
enableMockMode({
  simulateDelay: 100,
  autoTriggerTools: [
    // Wait 2 seconds, then start filling the form
    {
      tool: 'fill_field',
      args: { fieldName: 'firstName', value: 'Alice' },
      delay: 2000
    },
    {
      tool: 'fill_field',
      args: { fieldName: 'lastName', value: 'Johnson' },
      delay: 2200
    },
    {
      tool: 'fill_field',
      args: { fieldName: 'email', value: 'alice.johnson@example.com' },
      delay: 2400
    },
    {
      tool: 'fill_field',
      args: { fieldName: 'phone', value: '+1 (555) 987-6543' },
      delay: 2600
    },
    {
      tool: 'next_step',
      args: {},
      delay: 3000
    },
    {
      tool: 'fill_field',
      args: { fieldName: 'street', value: '456 Oak Avenue' },
      delay: 3200
    },
    {
      tool: 'fill_field',
      args: { fieldName: 'city', value: 'Los Angeles' },
      delay: 3400
    },
    {
      tool: 'fill_field',
      args: { fieldName: 'state', value: 'CA' },
      delay: 3600
    },
    {
      tool: 'fill_field',
      args: { fieldName: 'zipCode', value: '90001' },
      delay: 3800
    },
    {
      tool: 'next_step',
      args: {},
      delay: 4200
    },
    {
      tool: 'fill_field',
      args: { fieldName: 'cardNumber', value: '4532 1234 5678 9010' },
      delay: 4400
    },
    {
      tool: 'fill_field',
      args: { fieldName: 'expiry', value: '12/25' },
      delay: 4600
    },
    {
      tool: 'fill_field',
      args: { fieldName: 'cvv', value: '123' },
      delay: 4800
    },
    {
      tool: 'submit_form',
      args: {},
      delay: 5200
    }
  ]
});

// Wait for athreei to be ready
athreei.onReady((info) => {
  console.log('[Form Wizard] athreei ready:', info);
});

// Register tool: get_form_state
athreei.registerTool({
  name: 'get_form_state',
  description: 'Get the current state of the form including current step, field values, and validation status',
  parameters: {},
  handler: async () => {
    console.log('[Tool: get_form_state] Returning form state');

    return {
      currentStep: formState.currentStep,
      totalSteps: formState.totalSteps,
      fields: { ...formState.fields },
      errors: { ...formState.errors },
      isValid: Object.keys(formState.errors).length === 0,
      stepValid: validateStep().valid
    };
  }
});

// Register tool: fill_field
athreei.registerTool({
  name: 'fill_field',
  description: 'Fill a specific field in the form with a value',
  parameters: {
    fieldName: {
      type: 'string',
      required: true,
      description: 'The name of the field to fill (e.g., firstName, email, cardNumber)'
    },
    value: {
      type: 'string',
      required: true,
      description: 'The value to set for the field'
    }
  },
  handler: async ({ fieldName, value }) => {
    console.log(`[Tool: fill_field] Filling ${fieldName} with "${value}"`);

    // Check if field exists
    if (!(fieldName in formState.fields)) {
      return {
        success: false,
        error: `Field "${fieldName}" does not exist`
      };
    }

    // Update state
    formState.fields[fieldName] = value;
    formState.touched[fieldName] = true;

    // Update input element
    const input = document.getElementById(fieldName);
    if (input) {
      input.value = value;
      // Trigger input event to run any formatting/validation
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Validate the field
    const error = validateField(fieldName, value);
    if (error) {
      showFieldError(fieldName, error);
      return {
        success: true,
        validation: {
          valid: false,
          error
        }
      };
    } else {
      clearFieldError(fieldName);
      return {
        success: true,
        validation: {
          valid: true
        }
      };
    }
  }
});

// Register tool: next_step
athreei.registerTool({
  name: 'next_step',
  description: 'Move to the next step in the form wizard. Validates current step before proceeding.',
  parameters: {},
  handler: async () => {
    console.log('[Tool: next_step] Moving to next step');
    return nextStep();
  }
});

// Register tool: previous_step
athreei.registerTool({
  name: 'previous_step',
  description: 'Move to the previous step in the form wizard',
  parameters: {},
  handler: async () => {
    console.log('[Tool: previous_step] Moving to previous step');
    return previousStep();
  }
});

// Register tool: submit_form
athreei.registerTool({
  name: 'submit_form',
  description: 'Submit the completed form. Validates all steps before submitting.',
  parameters: {},
  handler: async () => {
    console.log('[Tool: submit_form] Submitting form');
    return submitForm();
  }
});

// Register tool: validate_step
athreei.registerTool({
  name: 'validate_step',
  description: 'Validate a specific step or the current step',
  parameters: {
    step: {
      type: 'number',
      required: false,
      description: 'The step number to validate (1-3). If not provided, validates current step.'
    }
  },
  handler: async ({ step }) => {
    const stepToValidate = step || formState.currentStep;
    console.log(`[Tool: validate_step] Validating step ${stepToValidate}`);

    if (stepToValidate < 1 || stepToValidate > formState.totalSteps) {
      return {
        valid: false,
        errors: [{ message: `Invalid step number: ${stepToValidate}` }]
      };
    }

    return validateStep(stepToValidate);
  }
});

console.log('[Form Wizard] All tools registered successfully');

// Initialize form when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initForm);
} else {
  initForm();
}
