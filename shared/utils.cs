using System;

namespace azure_parity
{
    public static class utils
    {
        public static string GetEnvironmentVariableOrFail(string name){
            var value = Environment.GetEnvironmentVariable(name);
            if (String.IsNullOrEmpty(value)){
                throw new ArgumentException(String.Format("Environment Variable variable {0} has not been set.", name));
            }
            return value;
        }
    }
}
