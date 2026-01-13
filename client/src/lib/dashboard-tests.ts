
export const testDashboardFunctionality = () => {
  const results = {
    widgets: {
      draggable: false,
      configurable: false,
      removable: false,
    },
    buttons: {
      quickActions: false,
      navigation: false,
      forms: false,
    },
    configuration: {
      settings: false,
      themes: false,
      jira: false,
    }
  };

  // Test widget drag and drop
  try {
    const widgets = document.querySelectorAll('[draggable="true"]');
    results.widgets.draggable = widgets.length > 0;
    console.log(`✅ Found ${widgets.length} draggable widgets`);
  } catch (error) {
    console.error('❌ Widget drag test failed:', error);
  }

  // Test configuration buttons
  try {
    const configButtons = document.querySelectorAll('button[title*="Configure"]');
    results.widgets.configurable = configButtons.length > 0;
    console.log(`✅ Found ${configButtons.length} configuration buttons`);
  } catch (error) {
    console.error('❌ Configuration button test failed:', error);
  }

  // Test remove buttons
  try {
    const removeButtons = document.querySelectorAll('button[title*="Remove"]');
    results.widgets.removable = removeButtons.length > 0;
    console.log(`✅ Found ${removeButtons.length} remove buttons`);
  } catch (error) {
    console.error('❌ Remove button test failed:', error);
  }

  // Test quick action buttons
  try {
    const quickActionButtons = document.querySelectorAll('.btn-add, .btn-save, .btn-create, .btn-update');
    results.buttons.quickActions = quickActionButtons.length > 0;
    console.log(`✅ Found ${quickActionButtons.length} quick action buttons`);
  } catch (error) {
    console.error('❌ Quick action button test failed:', error);
  }

  // Test navigation buttons
  try {
    const navButtons = document.querySelectorAll('button[onclick*="window.location"]');
    results.buttons.navigation = navButtons.length > 0;
    console.log(`✅ Found ${navButtons.length} navigation buttons`);
  } catch (error) {
    console.error('❌ Navigation button test failed:', error);
  }

  // Test form buttons
  try {
    const formButtons = document.querySelectorAll('form button[type="submit"], form button:not([type])');
    results.buttons.forms = formButtons.length > 0;
    console.log(`✅ Found ${formButtons.length} form buttons`);
  } catch (error) {
    console.error('❌ Form button test failed:', error);
  }

  console.log('🔍 Dashboard Functionality Test Results:', results);
  return results;
};

export const testWidgetInteractions = () => {
  console.log('🧪 Testing Widget Interactions...');
  
  // Test drag start events
  const widgets = document.querySelectorAll('[draggable="true"]');
  widgets.forEach((widget, index) => {
    try {
      const dragEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
      });
      widget.dispatchEvent(dragEvent);
      console.log(`✅ Widget ${index + 1} drag start event fired`);
    } catch (error) {
      console.error(`❌ Widget ${index + 1} drag test failed:`, error);
    }
  });

  // Test button clicks
  const buttons = document.querySelectorAll('button:not([disabled])');
  console.log(`🔘 Found ${buttons.length} active buttons for testing`);
  
  return {
    totalWidgets: widgets.length,
    totalButtons: buttons.length,
    timestamp: new Date().toISOString(),
  };
};

export const validateDashboardState = () => {
  const validation = {
    errors: [] as string[],
    warnings: [] as string[],
    passed: [] as string[],
  };

  // Check for required elements
  const requiredElements = [
    { selector: '[data-testid="dashboard"]', name: 'Dashboard container' },
    { selector: '.draggable-widget, [draggable="true"]', name: 'Draggable widgets' },
    { selector: 'button', name: 'Interactive buttons' },
  ];

  requiredElements.forEach(({ selector, name }) => {
    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) {
      validation.errors.push(`Missing: ${name}`);
    } else {
      validation.passed.push(`Found ${elements.length} ${name}`);
    }
  });

  // Check for accessibility issues
  const buttonsWithoutText = document.querySelectorAll('button:not([aria-label]):not([title]):empty');
  if (buttonsWithoutText.length > 0) {
    validation.warnings.push(`${buttonsWithoutText.length} buttons without accessible text`);
  }

  // Check for broken navigation
  const brokenLinks = document.querySelectorAll('a[href="#"], button[onclick=""]');
  if (brokenLinks.length > 0) {
    validation.warnings.push(`${brokenLinks.length} potentially broken navigation elements`);
  }

  console.log('✅ Dashboard Validation Results:', validation);
  return validation;
};

// Global test runner
if (typeof window !== 'undefined') {
  (window as any).testDashboard = {
    functionality: testDashboardFunctionality,
    interactions: testWidgetInteractions,
    validate: validateDashboardState,
  };
}
