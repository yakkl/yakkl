module Puppet::Parser::Functions
  newfunction(:yakklsecret, :type => :rvalue) do |args|
    default = args.pop
    joined = args.join(" ")
    output = `/usr/bin/crudini --get /etc/yakkl/yakkl-secrets.conf #{joined} 2>&1`; result=$?.success?
    if result
      output.strip()
    else
      default
    end
  end
end
