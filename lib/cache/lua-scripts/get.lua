--[[
Gets the value of a field in hash specified by the key.

Complexity: O(1).

Args:
    KEYS:
        hash_name.
        zset_name.

    ARGV:
        key.

Returns:
    - nil if the field has expired.
    - field's value when field does not have expiration time.
    - field's value when field has not expired yet.
--]]

local hash_name = KEYS[1]
local zset_name = KEYS[2]
local key = ARGV[1]
local time = redis.call('TIME')
local pnow = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
local pexpireat = redis.call('ZSCORE', zset_name, key)

if not pexpireat or pnow < tonumber(pexpireat) then
    return redis.call('HGET', hash_name, key)
end
