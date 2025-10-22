#!/usr/bin/env node

/**
 * Deployment validation script
 * Validates that all required configuration is in place before deployment
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✓ ${description} exists`, 'green');
    return true;
  } else {
    log(`✗ ${description} missing: ${filePath}`, 'red');
    return false;
  }
}

function validatePackageJson() {
  log('\n📦 Validating package.json...', 'blue');
  
  const packagePath = path.join(process.cwd(), 'package.json');
  if (!validateFileExists(packagePath, 'package.json')) {
    return false;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Check required dependencies
    const requiredDeps = [
      'ask-sdk-core',
      'ask-sdk-model',
      'aws-lambda',
      'aws-sdk',
      'axios'
    ];

    let allDepsPresent = true;
    requiredDeps.forEach(dep => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        log(`  ✓ ${dep}`, 'green');
      } else {
        log(`  ✗ Missing dependency: ${dep}`, 'red');
        allDepsPresent = false;
      }
    });

    // Check SAM scripts
    const requiredScripts = [
      'sam:build',
      'sam:deploy:dev',
      'deploy:dev'
    ];

    requiredScripts.forEach(script => {
      if (packageJson.scripts && packageJson.scripts[script]) {
        log(`  ✓ Script: ${script}`, 'green');
      } else {
        log(`  ✗ Missing script: ${script}`, 'red');
        allDepsPresent = false;
      }
    });

    return allDepsPresent;
  } catch (error) {
    log(`✗ Error reading package.json: ${error.message}`, 'red');
    return false;
  }
}

function validateSAMTemplate() {
  log('\n🏗️  Validating SAM template...', 'blue');
  
  const templatePath = path.join(process.cwd(), 'template.yaml');
  if (!validateFileExists(templatePath, 'SAM template')) {
    return false;
  }

  try {
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    
    // Check for required sections
    const requiredSections = [
      'AWSTemplateFormatVersion',
      'Transform: AWS::Serverless-2016-10-31',
      'Parameters:',
      'Resources:',
      'Outputs:'
    ];

    let allSectionsPresent = true;
    requiredSections.forEach(section => {
      if (templateContent.includes(section)) {
        log(`  ✓ ${section}`, 'green');
      } else {
        log(`  ✗ Missing section: ${section}`, 'red');
        allSectionsPresent = false;
      }
    });

    // Check for required resources
    const requiredResources = [
      'AlexaLLMChatFunction',
      'ConversationContextTable',
      'SubscriptionStatusTable',
      'AnalyticsTable'
    ];

    requiredResources.forEach(resource => {
      if (templateContent.includes(resource)) {
        log(`  ✓ Resource: ${resource}`, 'green');
      } else {
        log(`  ✗ Missing resource: ${resource}`, 'red');
        allSectionsPresent = false;
      }
    });

    return allSectionsPresent;
  } catch (error) {
    log(`✗ Error reading SAM template: ${error.message}`, 'red');
    return false;
  }
}

function validateSAMConfig() {
  log('\n⚙️  Validating SAM configuration...', 'blue');
  
  const configPath = path.join(process.cwd(), 'samconfig.toml');
  if (!validateFileExists(configPath, 'SAM config')) {
    return false;
  }

  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Check for required environments
    const requiredEnvs = ['[dev]', '[staging]', '[prod]'];
    
    let allEnvsPresent = true;
    requiredEnvs.forEach(env => {
      if (configContent.includes(env)) {
        log(`  ✓ Environment: ${env}`, 'green');
      } else {
        log(`  ✗ Missing environment: ${env}`, 'red');
        allEnvsPresent = false;
      }
    });

    return allEnvsPresent;
  } catch (error) {
    log(`✗ Error reading SAM config: ${error.message}`, 'red');
    return false;
  }
}

function validateParameterFiles() {
  log('\n📋 Validating parameter files...', 'blue');
  
  const environments = ['dev', 'staging', 'prod'];
  let allFilesValid = true;

  environments.forEach(env => {
    const paramPath = path.join(process.cwd(), 'deploy', `parameters-${env}.json`);
    if (validateFileExists(paramPath, `Parameters for ${env}`)) {
      try {
        const params = JSON.parse(fs.readFileSync(paramPath, 'utf8'));
        
        if (params.Parameters) {
          log(`  ✓ ${env} parameters structure valid`, 'green');
          
          // Check for placeholder API key
          if (params.Parameters.OpenRouterApiKey === 'REPLACE_WITH_YOUR_API_KEY') {
            log(`  ⚠️  ${env}: Remember to replace OpenRouterApiKey placeholder`, 'yellow');
          }
        } else {
          log(`  ✗ ${env}: Invalid parameters structure`, 'red');
          allFilesValid = false;
        }
      } catch (error) {
        log(`  ✗ ${env}: Error reading parameters: ${error.message}`, 'red');
        allFilesValid = false;
      }
    } else {
      allFilesValid = false;
    }
  });

  return allFilesValid;
}

function validateBuildOutput() {
  log('\n🔨 Validating build output...', 'blue');
  
  const distPath = path.join(process.cwd(), 'dist');
  const indexPath = path.join(distPath, 'index.js');
  
  if (fs.existsSync(distPath)) {
    log(`  ✓ dist directory exists`, 'green');
    
    if (fs.existsSync(indexPath)) {
      log(`  ✓ index.js built`, 'green');
      return true;
    } else {
      log(`  ✗ index.js not found - run 'npm run build'`, 'red');
      return false;
    }
  } else {
    log(`  ✗ dist directory not found - run 'npm run build'`, 'red');
    return false;
  }
}

function validateDeploymentReadiness() {
  log('\n📖 Validating deployment documentation...', 'blue');
  
  const readmePath = path.join(process.cwd(), 'deploy', 'README.md');
  return validateFileExists(readmePath, 'Deployment README');
}

function validateSkillConfiguration() {
  log('\n🎤 Validating Alexa skill configuration...', 'blue');
  
  const skillFiles = [
    'skill-package/skill.json',
    'skill-package/interactionModels/custom/en-US.json',
    'skill-package/isps/entitlement/premium_subscription.json',
    'skill-package/README.md',
    '.ask/ask-states.json'
  ];

  let allFilesValid = true;
  
  skillFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (!validateFileExists(filePath, `Skill file: ${file}`)) {
      allFilesValid = false;
    }
  });

  // Validate skill.json content
  try {
    const skillJsonPath = path.join(process.cwd(), 'skill-package/skill.json');
    if (fs.existsSync(skillJsonPath)) {
      const skillJson = JSON.parse(fs.readFileSync(skillJsonPath, 'utf8'));
      
      if (skillJson.manifest && skillJson.manifest.apis && skillJson.manifest.apis.custom) {
        log('  ✓ Skill manifest structure valid', 'green');
        
        // Check for placeholder values
        const endpoint = skillJson.manifest.apis.custom.endpoint.uri;
        if (endpoint.includes('YOUR_ACCOUNT_ID')) {
          log('  ⚠️  Remember to update Lambda ARN in skill.json', 'yellow');
        }
      } else {
        log('  ✗ Invalid skill manifest structure', 'red');
        allFilesValid = false;
      }
    }
  } catch (error) {
    log(`  ✗ Error validating skill.json: ${error.message}`, 'red');
    allFilesValid = false;
  }

  // Validate interaction model
  try {
    const modelPath = path.join(process.cwd(), 'skill-package/interactionModels/custom/en-US.json');
    if (fs.existsSync(modelPath)) {
      const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
      
      if (model.interactionModel && model.interactionModel.languageModel) {
        log('  ✓ Interaction model structure valid', 'green');
        
        const intents = model.interactionModel.languageModel.intents;
        const requiredIntents = ['ChatIntent', 'SubscriptionIntent', 'AMAZON.StopIntent'];
        
        requiredIntents.forEach(intent => {
          if (intents.find(i => i.name === intent)) {
            log(`    ✓ Intent: ${intent}`, 'green');
          } else {
            log(`    ✗ Missing intent: ${intent}`, 'red');
            allFilesValid = false;
          }
        });
      } else {
        log('  ✗ Invalid interaction model structure', 'red');
        allFilesValid = false;
      }
    }
  } catch (error) {
    log(`  ✗ Error validating interaction model: ${error.message}`, 'red');
    allFilesValid = false;
  }

  return allFilesValid;
}

function main() {
  log('🚀 Alexa LLM Chat - Deployment Validation', 'blue');
  log('==========================================', 'blue');

  const validations = [
    validatePackageJson,
    validateSAMTemplate,
    validateSAMConfig,
    validateParameterFiles,
    validateBuildOutput,
    validateDeploymentReadiness,
    validateSkillConfiguration
  ];

  let allValid = true;
  
  for (const validation of validations) {
    if (!validation()) {
      allValid = false;
    }
  }

  log('\n📊 Validation Summary', 'blue');
  log('====================', 'blue');

  if (allValid) {
    log('✅ All validations passed! Ready for deployment.', 'green');
    log('\nNext steps:', 'blue');
    log('1. Update API key in parameter files', 'yellow');
    log('2. Run: npm run deploy:dev', 'yellow');
    log('3. Configure Alexa skill (task 13.2)', 'yellow');
    process.exit(0);
  } else {
    log('❌ Some validations failed. Please fix the issues above.', 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validatePackageJson,
  validateSAMTemplate,
  validateSAMConfig,
  validateParameterFiles,
  validateBuildOutput,
  validateDeploymentReadiness
};